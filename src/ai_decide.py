# ai_decide.py
"""
AI Decide - Dynamic Contextual Safety & Guardian Engine
Reads target file/folder context, detects project repositories, system assets,
and security credentials dynamically to decide whether an item can be moved/deleted,
is strictly protected, or requires double confirmation.
"""

import os
import re

# Project indicator markers (file or directory existence in directory tree)
PROJECT_MARKERS = [
    '.git', '.gitignore', 'package.json', 'pyproject.toml', 'requirements.txt',
    'setup.py', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle',
    'settings.gradle', 'composer.json', 'pubspec.yaml', 'Makefile',
    'CMakeLists.txt', '.vscode', '.idea', 'Dockerfile', 'docker-compose.yml'
]

# Sensitive credentials & security file patterns
SENSITIVE_PATTERNS = [
    r'^\.env.*', r'.*\.pem$', r'.*\.key$', r'.*id_rsa.*', r'.*token\.json$',
    r'.*credentials\.json$', r'.*\.kdbx$', r'.*keystore.*', r'.*\.pfx$',
    r'.*\.sqlite3?$', r'.*\.mdf$', r'.*\.ldf$'
]

# System directories & file extensions
SYSTEM_DIRS = ['windows', 'system32', 'syswow64', 'program files', 'program files (x86)', 'windowsapps']
SYSTEM_EXTS = ['.sys', '.dll', '.drv', '.ocx', '.cpl', '.rom', '.efi']

class AIDecideEngine:
    def __init__(self, ai_engine=None):
        self.ai_engine = ai_engine

    def find_project_root(self, path):
        """Walks up directory hierarchy to dynamically detect if path is within an active code/dev project."""
        current = os.path.abspath(path)
        if os.path.isfile(current):
            current = os.path.dirname(current)

        while True:
            try:
                entries = set(os.listdir(current))
                for marker in PROJECT_MARKERS:
                    if marker in entries:
                        return current, marker
            except Exception:
                pass

            parent = os.path.dirname(current)
            if parent == current or not parent:
                break
            current = parent
        return None, None

    def evaluate(self, file_path, proposed_action='MOVE'):
        """
        Reads target file context and returns dynamic safety verdict:
        - decision: 'PROTECT' | 'CONFIRM_REQUIRED' | 'SAFE'
        - risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
        - can_move: bool
        - can_delete: bool
        - requires_confirmation: bool
        - reason: str (Indonesian explanation)
        - tags: list
        """
        abs_path = os.path.abspath(file_path)
        filename = os.path.basename(abs_path)
        base, ext = os.path.splitext(filename)
        ext_lower = ext.lower()
        path_lower = abs_path.lower()

        # 1. OS & System Integrity Check
        for sdir in SYSTEM_DIRS:
            if f'\\{sdir}\\' in path_lower or f'/{sdir}/' in path_lower:
                return {
                    'decision': 'PROTECT',
                    'risk_level': 'CRITICAL',
                    'can_move': False,
                    'can_delete': False,
                    'requires_confirmation': True,
                    'reason': f'Terdeteksi sebagai berkas/folder sistem operasi Windows ({filename}). AI Decide melarang pemindahan demi kestabilan OS.',
                    'action_advice': 'Biarkan tetap di lokasi sistem aslinya.',
                    'tags': ['os_system', 'critical_protected']
                }

        if ext_lower in SYSTEM_EXTS:
            return {
                'decision': 'PROTECT',
                'risk_level': 'CRITICAL',
                'can_move': False,
                'can_delete': False,
                'requires_confirmation': True,
                'reason': f'Berkas biner driver/sistem ({ext_lower}). Pemindahan berisiko merusak fungsionalitas sistem.',
                'action_advice': 'Dilarang memindahkan berkas driver/sistem.',
                'tags': ['system_binary', 'critical_protected']
            }

        # 2. Dynamic Project Repository Context Detection
        project_root, detected_marker = self.find_project_root(abs_path)
        if project_root:
            project_name = os.path.basename(project_root)
            return {
                'decision': 'PROTECT',
                'risk_level': 'CRITICAL',
                'can_move': False,
                'can_delete': False,
                'requires_confirmation': True,
                'project_root': project_root,
                'project_name': project_name,
                'reason': f'Berkas merupakan aset dalam repositori proyek aktif \'{project_name}\' (terdeteksi marker \'{detected_marker}\'). Menghapus atau memindahkan berkas ini akan merusak dependensi, build, atau kontrol versi proyek.',
                'action_advice': f'Biarkan berkas tetap di repositori proyek \'{project_name}\'.',
                'tags': ['project_asset', 'git_or_dev', 'critical_protected']
            }

        # 3. Sensitive / Credentials / Database Detection
        for pattern in SENSITIVE_PATTERNS:
            if re.match(pattern, filename, re.IGNORECASE):
                return {
                    'decision': 'CONFIRM_REQUIRED',
                    'risk_level': 'HIGH',
                    'can_move': True,
                    'can_delete': False,
                    'requires_confirmation': True,
                    'reason': f'Berkas sensitif / kredensial / basis data dideteksi ({filename}). AI Decide mewajibkan konfirmasi berulang sebelum tindakan dieksekusi.',
                    'action_advice': 'Verifikasi ulang izin otorisasi sebelum memindahkan atau menghapus.',
                    'tags': ['sensitive_credential_or_db', 'confirm_required']
                }

        # 4. Large Archives or Executable Installers
        if ext_lower in ['.exe', '.msi', '.iso']:
            return {
                'decision': 'CONFIRM_REQUIRED',
                'risk_level': 'MEDIUM',
                'can_move': True,
                'can_delete': False,
                'requires_confirmation': True,
                'reason': f'Berkas program eksekutabel / installer Windows ({filename}). Memerlukan konfirmasi pengguna sebelum dipindahkan.',
                'action_advice': 'Konfirmasi direktori target sebelum memindahkan program installer.',
                'tags': ['installer_program', 'confirm_required']
            }

        # 5. General Organizable Documents / Inbound Downloads
        return {
            'decision': 'SAFE',
            'risk_level': 'LOW',
            'can_move': True,
            'can_delete': True,
            'requires_confirmation': False,
            'reason': f'Berkas dokumen / unduhan mandiri yang aman untuk diklasifikasikan dan dipindahkan ke struktur perkuliahan atau arsip pribadi.',
            'action_advice': 'Aman dipindahkan dan diatur sesuai rekomendasi AI.',
            'tags': ['organizable_document', 'safe_to_organize']
        }

ai_decide_engine = AIDecideEngine()
