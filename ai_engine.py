# ai_engine.py
import os
import json
import re
import requests
from content_extractor import extract_content, get_file_metadata

ACADEMIC_COURSES = {
    '3KA31': {
        'AK011211 - Pemrograman Berbasis WEB': ['web', 'html', 'css', 'javascript', 'php', 'laravel', 'crud', 'frontend', 'backend', 'dom'],
        'AK011229 - Metode Penelitian': ['metode penelitian', 'plagiarisme', 'turnitin', 'mendeley', 'sitasi', 'kajian pustaka', 'etika akademik', 'karya ilmiah'],
        'AK011237 - Jejaring Sosial dan Konten Kreatif': ['jejaring sosial', 'konten kreatif', 'social media', 'creative content', 'influencer', 'digital marketing'],
        'AK011305 - Interaksi Manusia dan Komputer': ['interaksi manusia dan komputer', 'imk', 'human computer interaction', 'usability', 'heuristik', 'ui/ux', 'antarmuka', 'persona', 'rosny gonidjaya'],
        'AK011332 - Sistem Keamanan Teknologi Informasi': ['sistem keamanan teknologi informasi', 'skti', 'cyber security', 'kriptografi', 'firewall', 'keamanan jaringan', 'vulnerability'],
        'IT011234 - Konsep Data Mining': ['data mining', 'kdd', 'apriori', 'clustering', 'klasifikasi', 'asosiasi', 'decision tree', 'knn', 'k-means'],
        'IT011240 - Pengantar Sain Data': ['sain data', 'data science', 'crisp-dm', 'data scientist', 'machine learning dalam deteksi penyakit', 'machine learning', 'esai analitis'],
        'IT011308 - Graf dan Analisis Algoritma': ['graf', 'graph', 'analisis algoritma', 'dijkstra', 'kruskal', 'lintasan terpendek', 'kompleksitas', 'big o'],
        'Administrasi & Jadwal': ['krs', 'rencana studi', 'kartu rencana', 'absensi', 'jadwal kuliah']
    },
    '2KA31': {
        'Sistem Operasi': ['sistem operasi', 'operating system', 'deadlock', 'penjadwalan', 'paging', 'thread', 'botnet', 'malware', 'kernel', 'meta meysawati'],
        'Pemrograman Berorientasi Objek': ['pbo', 'pemrograman berorientasi objek', 'java', 'gui blueprint', 'lks pemrograman java', 'rubrik penilaian java', 'oop', 'class', 'inheritance'],
        'Riset Operasional': ['riset operasional', 'metode dua fase', 'simplex', 'model penugasan', 'linear programming'],
        'Statistika': ['statistika', 'disfrek', 'distribusi frekuensi', 'tdf', 'mqdp', 'median', 'desil', 'persentil', 'kuartil', 'data frame'],
        'Manajemen dan SIM 2': ['manajemen dan sim', 'keunggulan kompetitif', 'bpr dan crm', 'business process reengineering', 'customer relationship', 'shopee', 'fashion ashanty'],
        'Praktikum Lab': ['laporan akhir', 'laporan pendahuluan', 'scilab', 'sbd 2', 'sbd', 'data integrity', 'object relational', 'rstudio', '.rdata']
    }
}

class AIEngine:
    def __init__(self, config_path):
        self.config_path = config_path
        self.reload_config()

    def reload_config(self):
        if not os.path.exists(self.config_path):
            example_path = os.path.join(os.path.dirname(self.config_path), 'config.example.json')
            if os.path.exists(example_path):
                import shutil
                shutil.copy(example_path, self.config_path)
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        else:
            self.config = {}
        self.active_provider = self.config.get('active_provider', 'gemini')
        self.providers = self.config.get('providers', {})

    def get_provider_details(self):
        prov = self.providers.get(self.active_provider, {})
        return {
            'provider': self.active_provider,
            'name': prov.get('name', self.active_provider),
            'model': prov.get('model', 'gemini-3.5-flash-lite'),
            'has_key': bool(prov.get('api_key'))
        }

    def call_llm(self, prompt, system_instruction=''):
        prov_key = self.active_provider
        prov = self.providers.get(prov_key, {})
        api_key = prov.get('api_key', '')
        model = prov.get('model', 'gemini-3.5-flash-lite')

        # 1. Google Gemini API
        if prov_key == 'gemini':
            if not api_key:
                or_key = self.providers.get('openrouter', {}).get('api_key')
                if or_key:
                    return self._call_openrouter(prompt, system_instruction, or_key, 'google/gemini-2.5-flash')
                return self._local_fallback_response(prompt)
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
            payload = {
                'contents': [{'parts': [{'text': (system_instruction + '\n\n' + prompt).strip()}]}],
                'generationConfig': {'temperature': 0.2, 'maxOutputTokens': 1500}
            }
            try:
                r = requests.post(url, json=payload, timeout=20)
                if r.status_code == 200:
                    data = r.json()
                    candidates = data.get('candidates', [])
                    if candidates:
                        return candidates[0]['content']['parts'][0]['text']
                if 'gemini-3.5' in model:
                    fallback_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}'
                    r2 = requests.post(fallback_url, json=payload, timeout=20)
                    if r2.status_code == 200:
                        return r2.json()['candidates'][0]['content']['parts'][0]['text']
            except Exception as e:
                print(f'Gemini call error: {e}')

        # 2. OpenRouter API
        elif prov_key == 'openrouter':
            if not api_key:
                return self._local_fallback_response(prompt)
            return self._call_openrouter(prompt, system_instruction, api_key, model)

        # 3. OpenAI API
        elif prov_key == 'openai':
            if not api_key:
                return self._local_fallback_response(prompt)
            headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
            payload = {
                'model': model or 'gpt-4o-mini',
                'messages': [
                    {'role': 'system', 'content': system_instruction or 'You are an intelligent file manager assistant.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.2
            }
            try:
                r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload, timeout=20)
                if r.status_code == 200:
                    return r.json()['choices'][0]['message']['content']
            except Exception as e:
                print(f'OpenAI call error: {e}')

        # 4. Ollama (Local)
        elif prov_key == 'ollama':
            endpoint = prov.get('endpoint', 'http://localhost:11434').rstrip('/')
            url = f'{endpoint}/api/generate'
            payload = {'model': model or 'llama3.2', 'prompt': (system_instruction + '\n\n' + prompt).strip(), 'stream': False}
            try:
                r = requests.post(url, json=payload, timeout=30)
                if r.status_code == 200:
                    return r.json().get('response', '')
            except Exception as e:
                print(f'Ollama call error: {e}')

        return self._local_fallback_response(prompt)

    def _call_openrouter(self, prompt, system_instruction, api_key, model):
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/ai-file-manager',
            'X-Title': 'AI File Manager'
        }
        payload = {
            'model': model or 'google/gemini-2.5-flash',
            'messages': [
                {'role': 'system', 'content': system_instruction or 'You are an expert AI file manager and classifier.'},
                {'role': 'user', 'content': prompt}
            ],
            'temperature': 0.2
        }
        try:
            r = requests.post('https://openrouter.ai/api/v1/chat/completions', headers=headers, json=payload, timeout=20)
            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
        except Exception as e:
            print(f'OpenRouter call error: {e}')
        return self._local_fallback_response(prompt)

    def _local_fallback_response(self, prompt):
        return 'LOCAL_HEURISTIC_MODE'

    def classify_file(self, file_path):
        meta = get_file_metadata(file_path)
        if not meta:
            return None
        content = extract_content(file_path, max_chars=1800)
        filename = meta['name']
        ext = meta['extension'].lower()
        academic_base = self.config.get('academic_base', r'D:\Kuliah')
        personal_base = self.config.get('personal_base', r'D:\fadhl')
        project_base = self.config.get('project_base', r'D:\PROJECT')
        game_base = self.config.get('game_base', r'D:\Game')

        text_corpus = (filename + ' ' + content).lower()
        local_match = self._match_academic_rules(text_corpus, filename, ext)
        if local_match:
            return local_match

        # Minecraft assets
        if ext in ['.schem', '.nbt']:
            return {
                'category': 'Minecraft Assets',
                'target_folder': os.path.join(game_base, r'Minecraft Assets\Schematics'),
                'suggested_name': filename,
                'summary': 'Minecraft structure schematic file',
                'confidence': 0.98,
                'is_draft': False
            }
        if ext == '.jar' and any(k in filename.lower() for k in ['neoforge', 'forge', 'fabric', 'mod', '1.21']):
            return {
                'category': 'Minecraft Assets',
                'target_folder': os.path.join(game_base, r'Minecraft Assets\Mods'),
                'suggested_name': filename,
                'summary': 'Minecraft game modification JAR package',
                'confidence': 0.98,
                'is_draft': False
            }
        if ext == '.zip' and any(k in filename.lower() for k in ['shader', 'bsl', 'complementary', 'bliss', 'solas', 'vanilla']):
            return {
                'category': 'Minecraft Assets',
                'target_folder': os.path.join(game_base, r'Minecraft Assets\Shaders'),
                'suggested_name': filename,
                'summary': 'Minecraft graphics shaderpack archive',
                'confidence': 0.98,
                'is_draft': False
            }

        # Media
        if ext in ['.png', '.jpg', '.jpeg', '.webp', '.svg']:
            if 'ktp' in filename.lower() or 'identitas' in filename.lower():
                return {
                    'category': 'Personal Documents',
                    'target_folder': os.path.join(personal_base, r'Documents\Identitas & Dokumen Resmi'),
                    'suggested_name': filename,
                    'summary': 'Dokumen identitas resmi (KTP)',
                    'confidence': 0.99,
                    'is_draft': False
                }
            return {
                'category': 'Media & Pictures',
                'target_folder': os.path.join(personal_base, r'Pictures\Photos & Screenshots'),
                'suggested_name': filename,
                'summary': 'File gambar/foto',
                'confidence': 0.90,
                'is_draft': False
            }
        if ext in ['.mp4', '.mkv', '.avi', '.gif']:
            return {
                'category': 'Media & Videos',
                'target_folder': os.path.join(personal_base, r'Videos'),
                'suggested_name': filename,
                'summary': 'File rekaman video / animasi GIF',
                'confidence': 0.95,
                'is_draft': False
            }

        # Software installers
        if ext in ['.exe', '.msi'] or (ext == '.zip' and any(k in filename.lower() for k in ['installer', 'setup', 'windows'])):
            return {
                'category': 'Software Installers',
                'target_folder': r'D:\DOWNLOAD\Installers',
                'suggested_name': filename,
                'summary': 'Paket installer aplikasi Windows',
                'confidence': 0.95,
                'is_draft': False
            }

        # Query LLM
        prompt = f"""Analisis file berikut dan klasifikasikan ke dalam folder tujuan yang tepat.
Nama File: {filename}
Ukuran: {meta['size']} bytes
Ekstensi: {ext}
Cuplikan Isi Teks:
{content[:1000]}

Pilihan Folder Utama:
- D:\\Kuliah\\3KA31\\<Mata Kuliah> (Pemrograman Berbasis WEB, Metode Penelitian, Jejaring Sosial dan Konten Kreatif, Interaksi Manusia dan Komputer, Sistem Keamanan Teknologi Informasi, Konsep Data Mining, Pengantar Sain Data, Graf dan Analisis Algoritma)
- D:\\Kuliah\\2KA31\\<Mata Kuliah> (Sistem Operasi, Pemrograman Berorientasi Objek, Riset Operasional, Statistika, Manajemen dan SIM 2, Praktikum Lab)
- D:\\fadhl\\Documents\\<Kategori>
- D:\\fadhl\\Music\\Tabs
- D:\\PROJECT\\<Project>
- D:\\Game\\Minecraft Assets\\<Shaders/Mods/Schematics>
- D:\\DOWNLOAD\\Installers

Keluarkan HANYA JSON murni format ini tanpa markdown:
{{
  "category": "Kategori ringkas",
  "target_folder": "Path absolut Windows tujuan",
  "suggested_name": "Nama file baru yang rapi",
  "summary": "Ringkasan isi 1 kalimat",
  "confidence": 0.95,
  "is_draft": false
}}"""
        resp = self.call_llm(prompt)
        if resp and resp != 'LOCAL_HEURISTIC_MODE':
            try:
                clean_json = resp.strip()
                if '```json' in clean_json:
                    clean_json = clean_json.split('```json')[1].split('```')[0].strip()
                elif '```' in clean_json:
                    clean_json = clean_json.split('```')[1].split('```')[0].strip()
                parsed = json.loads(clean_json)
                if 'target_folder' in parsed and 'suggested_name' in parsed:
                    return parsed
            except Exception as e:
                print(f'JSON parse error: {e}')

        return {
            'category': 'Dokumen Umum',
            'target_folder': os.path.join(personal_base, 'Documents'),
            'suggested_name': filename,
            'summary': f'Dokumen berkas {ext}',
            'confidence': 0.70,
            'is_draft': False
        }

    def _match_academic_rules(self, text, filename, ext):
        academic_base = self.config.get('academic_base', r'D:\Kuliah')
        for semester, courses in ACADEMIC_COURSES.items():
            for course_name, keywords in courses.items():
                match_count = sum(1 for kw in keywords if kw in text)
                if match_count >= 1:
                    target_dir = os.path.join(academic_base, semester, course_name)
                    is_draft = any(d in filename.lower() for d in ['(1)', 'draft', 'copy', 'salinan', 'temp'])
                    if is_draft and not course_name.startswith('Administrasi'):
                        target_dir = os.path.join(target_dir, 'Draft')

                    clean_name = filename
                    if filename.lower().startswith('document') or filename.lower().startswith('dokumen'):
                        clean_name = f'Tugas_{course_name.split(" - ")[-1].replace(" ", "_")}{ext}'

                    return {
                        'category': f'Akademik ({semester})',
                        'course': course_name,
                        'target_folder': target_dir,
                        'suggested_name': clean_name,
                        'summary': f'Materi / tugas kuliah {course_name} ({semester})',
                        'confidence': 0.96,
                        'is_draft': is_draft
                    }
        return None

    def execute_chat_query(self, message, current_path="D:\\"):
        system_instruction = f"""Anda adalah AI Assistant terintegrasi di dalam AI File Manager.
Sistem saat ini sedang berada di path: {current_path}
Pengguna dapat meminta Anda untuk:
1. Menjelaskan, menganalisis, atau merangkum isi file.
2. Meminta operasi file CRUD: membuat folder, merename file, memindahkan file, atau menghapus file.

Jika pengguna meminta operasi file atau modifikasi direktori, Anda HARUS menyertakan blok JSON perintah di akhir jawaban Anda dengan format:
ACTION_BLOCK:
{{
  "action": "create_folder" | "move" | "rename" | "delete",
  "src": "path sumber",
  "dst": "path tujuan / nama baru"
}}

Jika tidak ada operasi file yang perlu dieksekusi, berikan penjelasan teks ramah dan profesional."""
        
        resp = self.call_llm(message, system_instruction=system_instruction)
        action_data = None
        clean_text = resp
        if 'ACTION_BLOCK:' in resp:
            parts = resp.split('ACTION_BLOCK:')
            clean_text = parts[0].strip()
            try:
                raw_action = parts[1].strip()
                if '```json' in raw_action:
                    raw_action = raw_action.split('```json')[1].split('```')[0].strip()
                elif '```' in raw_action:
                    raw_action = raw_action.split('```')[1].split('```')[0].strip()
                action_data = json.loads(raw_action)
            except Exception as e:
                print(f'Failed parsing action block: {e}')

        return {
            'reply': clean_text,
            'action': action_data
        }
