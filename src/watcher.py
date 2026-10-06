# watcher.py
import os
import time
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from ai_decide import ai_decide_engine
from activity_tracker import activity_tracker

class FileQueueManager:
    def __init__(self, ai_engine):
        self.ai_engine = ai_engine
        self.queue = []
        self.seen_paths = set()
        self.listeners = []
        self.lock = threading.Lock()

    def add_listener(self, callback):
        self.listeners.append(callback)

    def notify_listeners(self, event_type, item):
        for cb in self.listeners:
            try:
                cb(event_type, item)
            except Exception as e:
                print(f'Listener notification error: {e}')

    def add_to_queue(self, file_path):
        norm_path = os.path.normpath(file_path)
        if not os.path.exists(norm_path) or os.path.isdir(norm_path):
            return

        # 1. Immediate AI Decide Safety Check
        safety = ai_decide_engine.evaluate(norm_path)
        basename = os.path.basename(norm_path)

        # If it is part of an active dev project (e.g. PROJECT/file-manager-organizer-pc-ai)
        # and strictly PROTECTED, do NOT stage for auto-movement!
        if safety['decision'] == 'PROTECT':
            activity_tracker.record_event(
                'protected_block',
                f'AI Decide Proteksi: {basename}',
                safety['reason'],
                icon='shield-check',
                target_path=norm_path
            )
            print(f"[AI Decide] PROTECTED: {norm_path} -> {safety['reason']}")
            return

        with self.lock:
            if norm_path in self.seen_paths:
                return
            
            # Filter temporary/system files
            if basename.startswith('~$') or basename.startswith('.') or basename.endswith('.tmp') or basename.endswith('.crdownload') or basename == 'desktop.ini':
                return

            self.seen_paths.add(norm_path)
            
            size = 0
            try:
                size = os.path.getsize(norm_path)
            except Exception:
                pass

            item = {
                'id': f'q_{int(time.time()*1000)}_{len(self.queue)}',
                'path': norm_path,
                'name': basename,
                'size': size,
                'timestamp': time.time(),
                'status': 'pending',
                'safety': safety,
                'classification': None
            }
            self.queue.append(item)

        # Asynchronously classify with AI
        threading.Thread(target=self._async_analyze_item, args=(item,), daemon=True).start()
        self.notify_listeners('item_added', item)

    def _async_analyze_item(self, item):
        time.sleep(0.4)
        try:
            classification = self.ai_engine.classify_file(item['path'])
            safety = ai_decide_engine.evaluate(item['path'])
            with self.lock:
                item['classification'] = classification
                item['safety'] = safety
                item['status'] = 'analyzed'
            
            activity_tracker.record_event(
                'ai_scan',
                f'Analisis AI: {item["name"]}',
                f'Kategori: {classification.get("category", "General")} (Safety: {safety["decision"]})',
                icon='search',
                target_path=item['path']
            )
            self.notify_listeners('item_analyzed', item)
        except Exception as e:
            print(f'Async analyze error on {item["path"]}: {e}')

    def get_queue(self):
        with self.lock:
            return [x for x in self.queue if x['status'] in ['pending', 'analyzed']]

    def dismiss_item(self, item_id):
        with self.lock:
            for it in self.queue:
                if it['id'] == item_id:
                    it['status'] = 'dismissed'
                    self.notify_listeners('item_dismissed', it)
                    return True
        return False

    def mark_completed(self, item_id):
        with self.lock:
            for it in self.queue:
                if it['id'] == item_id:
                    it['status'] = 'completed'
                    self.notify_listeners('item_completed', it)
                    return True
        return False


class MultiPathWatcher(FileSystemEventHandler):
    def __init__(self, queue_manager, paths):
        super().__init__()
        self.queue_manager = queue_manager
        self.paths = paths
        self.observer = Observer()
        self.running = False

    def on_created(self, event):
        if not event.is_directory:
            threading.Thread(target=self._delayed_add, args=(event.src_path,), daemon=True).start()

    def _delayed_add(self, src_path):
        time.sleep(0.3)
        self.queue_manager.add_to_queue(src_path)

    def start(self):
        if self.running:
            return
        valid_paths = [p for p in self.paths if os.path.exists(p)]
        if not valid_paths:
            print("No valid paths to monitor.")
            return

        for p in valid_paths:
            try:
                self.observer.schedule(self, p, recursive=True)
                print(f"[Watchdog] Monitoring: {p}")
            except Exception as e:
                print(f"[Watchdog] Failed to schedule {p}: {e}")

        self.observer.start()
        self.running = True

    def stop(self):
        if self.running:
            try:
                self.observer.stop()
                self.observer.join(timeout=1.0)
            except Exception:
                pass
            self.running = False
