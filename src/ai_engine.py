# ai_engine.py
import os
import json
import re
import requests
import time
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
    def __init__(self, config_path, broadcaster=None):
        self.config_path = config_path
        self.broadcaster = broadcaster
        self.reload_config()

    def broadcast_status(self, status: str, scenario: str = None, message: str = "", **kwargs):
        if self.broadcaster:
            try:
                self.broadcaster({
                    "type": "agent_status",
                    "status": status,
                    "scenario": scenario,
                    "message": message,
                    **kwargs
                })
            except Exception:
                pass

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

    def _execute_provider_http(self, prov_key, model, api_key, prov, prompt, system_instruction, temperature=0.2, max_tokens=1500):
        """Executes a single HTTP call to the designated provider and returns structured result."""
        # 1. Google Gemini
        if prov_key == 'gemini':
            if not api_key:
                return {"success": False, "error_type": "AUTH_ERROR_401", "error_message": "Kunci API Gemini belum diisi."}
            clean_m = model.replace('gemini/', '')
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{clean_m}:generateContent?key={api_key}'
            payload = {
                'contents': [{'parts': [{'text': (system_instruction + '\n\n' + prompt).strip()}]}],
                'generationConfig': {'temperature': temperature, 'maxOutputTokens': max_tokens}
            }
            try:
                r = requests.post(url, json=payload, timeout=25)
                if r.status_code == 200:
                    data = r.json()
                    candidates = data.get('candidates', [])
                    if candidates and 'content' in candidates[0]:
                        return {"success": True, "text": candidates[0]['content']['parts'][0]['text'], "status_code": 200}
                elif r.status_code == 429:
                    return {"success": False, "error_type": "RATE_LIMIT_429", "status_code": 429, "error_message": f"Batas kuota TPM/RPM tercapai pada model {clean_m}."}
                elif r.status_code in [500, 502, 503, 504]:
                    return {"success": False, "error_type": "SERVER_ERROR_5XX", "status_code": r.status_code, "error_message": f"Server Gemini sedang sibuk/overload ({r.status_code})."}
                elif r.status_code in [401, 403]:
                    return {"success": False, "error_type": "AUTH_ERROR_401", "status_code": r.status_code, "error_message": "API key Gemini tidak valid atau izin ditolak."}
                else:
                    return {"success": False, "error_type": "GENERAL_ERROR", "status_code": r.status_code, "error_message": f"Gemini API error ({r.status_code}): {r.text[:150]}"}
            except requests.exceptions.Timeout:
                return {"success": False, "error_type": "TIMEOUT_ERROR", "error_message": "Koneksi ke Gemini timeout (25s)."}
            except Exception as e:
                return {"success": False, "error_type": "NETWORK_ERROR", "error_message": str(e)}

        # 2. OpenRouter
        elif prov_key == 'openrouter':
            if not api_key:
                return {"success": False, "error_type": "AUTH_ERROR_401", "error_message": "Kunci API OpenRouter belum diisi."}
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/ai-file-manager',
                'X-Title': 'OmniFile AI'
            }
            payload = {
                'model': model or 'google/gemini-2.5-flash',
                'messages': [
                    {'role': 'system', 'content': system_instruction or 'You are an expert AI file manager.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': temperature,
                'max_tokens': max_tokens
            }
            try:
                r = requests.post('https://openrouter.ai/api/v1/chat/completions', headers=headers, json=payload, timeout=28)
                if r.status_code == 200:
                    data = r.json()
                    choices = data.get('choices', [])
                    if choices:
                        return {"success": True, "text": choices[0]['message']['content'], "status_code": 200}
                elif r.status_code == 429:
                    return {"success": False, "error_type": "RATE_LIMIT_429", "status_code": 429, "error_message": "Rate limit tercapai di OpenRouter (429)."}
                elif r.status_code in [500, 502, 503, 504]:
                    return {"success": False, "error_type": "SERVER_ERROR_5XX", "status_code": r.status_code, "error_message": "Server upstream OpenRouter overload."}
                elif r.status_code in [401, 403]:
                    return {"success": False, "error_type": "AUTH_ERROR_401", "status_code": r.status_code, "error_message": "API key OpenRouter tidak valid."}
                else:
                    return {"success": False, "error_type": "GENERAL_ERROR", "status_code": r.status_code, "error_message": f"OpenRouter status {r.status_code}"}
            except requests.exceptions.Timeout:
                return {"success": False, "error_type": "TIMEOUT_ERROR", "error_message": "OpenRouter timeout."}
            except Exception as e:
                return {"success": False, "error_type": "NETWORK_ERROR", "error_message": str(e)}

        # 3. OpenAI / Groq / DeepSeek / Custom
        elif prov_key in ['openai', 'groq', 'deepseek', 'custom']:
            if not api_key and prov_key != 'custom':
                return {"success": False, "error_type": "AUTH_ERROR_401", "error_message": f"API key {prov_key} belum diisi."}
            default_endpoints = {
                'openai': 'https://api.openai.com/v1',
                'groq': 'https://api.groq.com/openai/v1',
                'deepseek': 'https://api.deepseek.com/v1',
                'custom': 'http://localhost:1234/v1'
            }
            endpoint = prov.get('endpoint') or default_endpoints.get(prov_key, 'https://api.openai.com/v1')
            endpoint = endpoint.rstrip('/')
            url = f"{endpoint}/chat/completions" if not endpoint.endswith('/chat/completions') else endpoint
            headers = {'Authorization': f'Bearer {api_key or "local"}', 'Content-Type': 'application/json'}
            payload = {
                'model': model or ('llama-3.3-70b-versatile' if prov_key == 'groq' else 'gpt-4o-mini'),
                'messages': [
                    {'role': 'system', 'content': system_instruction or 'You are an intelligent file manager assistant.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': temperature,
                'max_tokens': max_tokens
            }
            try:
                r = requests.post(url, headers=headers, json=payload, timeout=28)
                if r.status_code == 200:
                    data = r.json()
                    choices = data.get('choices', [])
                    if choices:
                        return {"success": True, "text": choices[0]['message']['content'], "status_code": 200}
                elif r.status_code == 429:
                    return {"success": False, "error_type": "RATE_LIMIT_429", "status_code": 429, "error_message": f"Batas kuota/rate limit tercapai pada {prov_key} (429)."}
                elif r.status_code in [500, 502, 503, 504]:
                    return {"success": False, "error_type": "SERVER_ERROR_5XX", "status_code": r.status_code, "error_message": f"Server {prov_key} overload ({r.status_code})."}
                elif r.status_code in [401, 403]:
                    return {"success": False, "error_type": "AUTH_ERROR_401", "status_code": r.status_code, "error_message": f"API key {prov_key} tidak valid."}
                else:
                    return {"success": False, "error_type": "GENERAL_ERROR", "status_code": r.status_code, "error_message": f"{prov_key} error: {r.text[:120]}"}
            except requests.exceptions.Timeout:
                return {"success": False, "error_type": "TIMEOUT_ERROR", "error_message": f"{prov_key} timeout."}
            except Exception as e:
                return {"success": False, "error_type": "NETWORK_ERROR", "error_message": str(e)}

        # 4. Ollama Local
        elif prov_key == 'ollama':
            endpoint = prov.get('endpoint', 'http://localhost:11434').rstrip('/')
            url = f'{endpoint}/api/generate'
            payload = {'model': model or 'llama3.2', 'prompt': (system_instruction + '\n\n' + prompt).strip(), 'stream': False}
            try:
                r = requests.post(url, json=payload, timeout=35)
                if r.status_code == 200:
                    return {"success": True, "text": r.json().get('response', ''), "status_code": 200}
                return {"success": False, "error_type": "SERVER_ERROR_5XX", "error_message": f"Ollama error: status {r.status_code}"}
            except Exception as e:
                return {"success": False, "error_type": "NETWORK_ERROR", "error_message": f"Ollama server tidak merespons: {e}"}

        return {"success": False, "error_type": "UNKNOWN_PROVIDER", "error_message": f"Provider {prov_key} tidak dikenal."}

    def call_llm(self, prompt, system_instruction='', model_override=None, temperature=0.2, max_tokens=1500, provider_override=None):
        """
        Resilient Multi-Provider LLM Caller with:
        - Scenario-based Error Detection
        - Auto-failover to alternative configured providers
        - 5-10s countdown retry with auto-resume
        """
        prov_key = provider_override.lower().strip() if provider_override else self.active_provider
        prov = self.providers.get(prov_key, {})
        model = prov.get('model', 'gemini-3.5-flash-lite')
        api_key = prov.get('api_key', '')

        # Model override parsing
        if model_override:
            mo_clean = model_override.strip()
            if mo_clean.lower() == 'local-heuristic' or 'local' in mo_clean.lower():
                return self._local_fallback_response(prompt)
            
            for p_prefix in ['openrouter/', 'openai/', 'gemini/', 'groq/', 'deepseek/', 'ollama/', 'custom/']:
                if mo_clean.lower().startswith(p_prefix):
                    prov_key = p_prefix.rstrip('/')
                    prov = self.providers.get(prov_key, {})
                    model = mo_clean[len(p_prefix):]
                    api_key = prov.get('api_key', api_key)
                    break
            else:
                if 'gemini' in mo_clean.lower():
                    prov_key = 'gemini'
                    prov = self.providers.get('gemini', {})
                    api_key = prov.get('api_key', api_key)
                    model = mo_clean
                elif 'gpt' in mo_clean.lower() or 'o3' in mo_clean.lower():
                    prov_key = 'openai'
                    prov = self.providers.get('openai', {})
                    api_key = prov.get('api_key', api_key)
                    model = mo_clean
                elif 'claude' in mo_clean.lower() or 'llama' in mo_clean.lower():
                    prov_key = 'openrouter' if 'openrouter' in self.providers else ('groq' if 'groq' in self.providers else prov_key)
                    prov = self.providers.get(prov_key, {})
                    api_key = prov.get('api_key', api_key)
                    model = mo_clean
                else:
                    model = mo_clean

        # Attempt Primary Call
        result = self._execute_provider_http(prov_key, model, api_key, prov, prompt, system_instruction, temperature, max_tokens)
        if result.get("success"):
            return result["text"]

        err_type = result.get("error_type", "GENERAL_ERROR")
        err_msg = result.get("error_message", "Error pada penyedia model.")

        # Scenario Error Broadcast
        self.broadcast_status(
            status="model_error",
            scenario=err_type,
            provider=prov_key,
            model=model,
            message=err_msg
        )

        # Attempt Auto-Failover to other available providers with valid API keys
        fallback_candidates = []
        for cand_key, cand_prov in self.providers.items():
            if cand_key != prov_key and cand_prov.get('api_key'):
                fallback_candidates.append((cand_key, cand_prov))

        for alt_key, alt_prov in fallback_candidates:
            alt_model = alt_prov.get('model', '')
            self.broadcast_status(
                status="switching_provider",
                scenario=err_type,
                from_provider=prov_key,
                to_provider=alt_key,
                to_model=alt_model,
                message=f"Model {model} ({prov_key}) mengalami kendala ({err_type}). Mengalihkan otomatis ke provider cadangan: {alt_key} ({alt_model})..."
            )
            alt_res = self._execute_provider_http(
                alt_key, alt_model, alt_prov.get('api_key', ''), alt_prov,
                prompt, system_instruction, temperature, max_tokens
            )
            if alt_res.get("success"):
                self.broadcast_status(
                    status="recovered",
                    provider=alt_key,
                    model=alt_model,
                    message=f"Berhasil mengalihkan ke {alt_key} ({alt_model}) dan melanjutkan proses."
                )
                return alt_res["text"]

        # If no alternative provider or all failed, run Retry Loop with 5-10s countdown
        if err_type in ["RATE_LIMIT_429", "SERVER_ERROR_5XX", "TIMEOUT_ERROR"]:
            max_attempts = 3
            for attempt in range(1, max_attempts + 1):
                wait_seconds = 5 + (attempt * 2)  # 7s, 9s, 11s
                for sec in range(wait_seconds, 0, -1):
                    self.broadcast_status(
                        status="retrying",
                        scenario=err_type,
                        provider=prov_key,
                        model=model,
                        attempt=attempt,
                        max_attempts=max_attempts,
                        countdown=sec,
                        message=f"Model sedang limit/sibuk ({err_type}). Menunggu retry otomatis dalam {sec} detik (Percobaan {attempt}/{max_attempts})..."
                    )
                    time.sleep(1.0)

                self.broadcast_status(
                    status="retrying_now",
                    scenario=err_type,
                    provider=prov_key,
                    model=model,
                    attempt=attempt,
                    message=f"Mencoba kembali request ke {prov_key} ({model})..."
                )
                retry_res = self._execute_provider_http(
                    prov_key, model, api_key, prov, prompt, system_instruction, temperature, max_tokens
                )
                if retry_res.get("success"):
                    self.broadcast_status(
                        status="recovered",
                        provider=prov_key,
                        model=model,
                        message=f"Layanan {prov_key} pulih! Berhasil melanjutkan investigasi."
                    )
                    return retry_res["text"]

        # Final fallback to deterministic local heuristic
        self.broadcast_status(
            status="failed",
            scenario=err_type,
            message="Semua provider dan retry telah dicoba. Menggunakan mode analitis lokal mandiri."
        )
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
