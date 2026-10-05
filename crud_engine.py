# crud_engine.py
import os
import shutil
import hashlib
import subprocess
import send2trash
from content_extractor import get_file_metadata, extract_content

IGNORED_SYSTEM_NAMES = {
    '$recycle.bin', 'system volume information', 'dumpstack.log.tmp',
    'pagefile.sys', 'hiberfil.sys', 'swapfile.sys', '$windows.~bt',
    '$windows.~ws', 'msocache'
}

def is_system_file(name: str) -> bool:
    low = name.lower()
    if low in IGNORED_SYSTEM_NAMES or low.startswith('$'):
        return True
    return False

def get_drives_info():
    drives = []
    for letter in ['C', 'D']:
        path = f'{letter}:\\\\'
        if os.path.exists(path):
            total, used, free = shutil.disk_usage(path)
            drives.append({
                'letter': letter,
                'path': path,
                'total_gb': round(total / (1024**3), 1),
                'used_gb': round(used / (1024**3), 1),
                'free_gb': round(free / (1024**3), 1),
                'percent_used': round((used / total) * 100, 1)
            })
    return drives

def get_storage_details():
    drives = get_drives_info()
    key_spaces = [
        {"name": "Kuliah (2KA & 3KA)", "path": r"D:\\Kuliah", "icon": "graduation-cap"},
        {"name": "DOWNLOAD & Installers", "path": r"D:\\DOWNLOAD", "icon": "download-simple"},
        {"name": "Developer Projects", "path": r"D:\\PROJECT", "icon": "code"},
        {"name": "Game & Minecraft Assets", "path": r"D:\\Game", "icon": "game-controller"},
        {"name": "Personal Workspace", "path": r"D:\\fadhl", "icon": "user"},
        {"name": "OneDrive Documents", "path": os.path.expanduser(r"~\\OneDrive\\Documents"), "icon": "files"}
    ]
    space_stats = []
    for sp in key_spaces:
        p = sp["path"]
        if os.path.exists(p):
            try:
                entries = [e for e in os.listdir(p) if not is_system_file(e)]
                count = len(entries)
                space_stats.append({
                    "name": sp["name"],
                    "path": p,
                    "icon": sp["icon"],
                    "items": count,
                    "status": "Tersedia"
                })
            except Exception:
                pass
    return {
        "drives": drives,
        "spaces": space_stats
    }

def list_directory(target_path):
    if not os.path.exists(target_path):
        return {'error': f'Path tidak ditemukan: {target_path}', 'items': []}
    
    if os.path.isfile(target_path):
        target_path = os.path.dirname(target_path)

    items = []
    try:
        with os.scandir(target_path) as entries:
            for entry in entries:
                # Filter out OS protected/system files
                if is_system_file(entry.name):
                    continue
                try:
                    is_dir = entry.is_dir(follow_symlinks=False)
                    stat = entry.stat(follow_symlinks=False)
                    ext = os.path.splitext(entry.name)[1].lower() if not is_dir else ''
                    items.append({
                        'name': entry.name,
                        'path': entry.path,
                        'is_dir': is_dir,
                        'size': stat.st_size if not is_dir else 0,
                        'modified': stat.st_mtime,
                        'extension': ext
                    })
                except Exception:
                    continue
    except Exception as e:
        return {'error': str(e), 'items': []}

    # Sort directories first, then files alphabetically
    items.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
    return {
        'path': os.path.abspath(target_path),
        'items': items
    }

def create_folder(parent_path, folder_name):
    target = os.path.join(parent_path, folder_name)
    try:
        os.makedirs(target, exist_ok=True)
        return {'success': True, 'path': target}
    except Exception as e:
        return {'error': str(e)}

def rename_item(src_path, new_name):
    if not os.path.exists(src_path):
        return {'error': 'Sumber tidak ditemukan'}
    parent = os.path.dirname(src_path)
    dst = os.path.join(parent, new_name)
    try:
        os.rename(src_path, dst)
        return {'success': True, 'new_path': dst}
    except Exception as e:
        return {'error': str(e)}

def move_item(src_path, dst_dir, new_name=None):
    if not os.path.exists(src_path):
        return {'error': f'Sumber tidak ditemukan: {src_path}'}
    if not os.path.exists(dst_dir):
        os.makedirs(dst_dir, exist_ok=True)

    filename = new_name or os.path.basename(src_path)
    dst_path = os.path.join(dst_dir, filename)

    # Collision avoidance & Duplicate verification via MD5
    if os.path.exists(dst_path) and os.path.abspath(src_path) != os.path.abspath(dst_path):
        src_md5 = _get_md5(src_path)
        dst_md5 = _get_md5(dst_path)
        if src_md5 and dst_md5 and src_md5 == dst_md5:
            # File is identical duplicate, safely send src to Recycle Bin
            try:
                send2trash.send2trash(src_path)
                return {'success': True, 'dst_path': dst_path, 'note': 'Duplicate berkas identik dideteksi, sumber dipindahkan ke Recycle Bin.'}
            except Exception:
                pass
        
        # Conflict: Rename with suffix
        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(os.path.join(dst_dir, f"{base}_{counter}{ext}")):
            counter += 1
        dst_path = os.path.join(dst_dir, f"{base}_{counter}{ext}")

    try:
        shutil.move(src_path, dst_path)
        return {'success': True, 'dst_path': dst_path}
    except Exception as e:
        return {'error': str(e)}

def delete_item(item_path):
    if not os.path.exists(item_path):
        return {'error': 'Path tidak ditemukan'}
    try:
        # Recycle Bin Safe Deletion
        send2trash.send2trash(item_path)
        return {'success': True, 'message': 'Dipindahkan ke Windows Recycle Bin'}
    except Exception as e:
        return {'error': str(e)}

def open_in_windows_explorer(target_path):
    if not os.path.exists(target_path):
        target_path = os.path.dirname(target_path)
    try:
        if os.path.isdir(target_path):
            subprocess.Popen(['explorer', target_path])
        else:
            subprocess.Popen(['explorer', '/select,', target_path])
        return {'success': True}
    except Exception as e:
        return {'error': str(e)}

def _get_md5(filepath):
    if os.path.isdir(filepath):
        return None
    hash_md5 = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception:
        return None
