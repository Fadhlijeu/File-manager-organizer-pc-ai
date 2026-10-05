# watcher.py
import os
import time
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

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
        with self.lock:
            norm_path = os.path.normpath(file_path)
            if norm_path in self.seen_paths:
                return
            if not os.path.exists(norm_path) or os.path.isdir(norm_path):
                return
            
            # Filter temporary/system files
            basename = os.path.basename(norm_path)
            if basename.startswith('~$') or basename.startswith('.') or basename.endswith('.tmp') or basename.endswith('.crdownload') or basename == 'desktop.ini':
                return

            self.seen_paths.add(norm_path)
            
            # Initial metadata
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
                'status': 'pending', # pending, analyzed, moved, dismissed
                'classification': None
            }
            self.queue.append(item)

        # Asynchronously classify with AI
        threading.Thread(target=self._async_analyze_item, args=(item,), daemon=True).start()
        self.notify_listeners('item_added', item)

    def _async_analyze_item(self, item):
        time.sleep(0.5) # Wait for file write completion
        try:
            classification = self.ai_engine.classify_file(item['path'])
            with self.lock:
                item['classification'] = classification
                item['status'] = 'analyzed'
            self.notify_listeners('item_analyzed', item)
        except Exception as e:
            print(f'Async analyze error on {item["path"]}: {e}')

    def get_queue(self):
        with self.lock:
            # return pending or analyzed items
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
            # Debounce file arrival
            threading.Thread(target=self._delayed_add, args=(event.src_path,), daemon=True).start()

    def on_moved(self, event):
        if not event.is_directory:
            threading.Thread(target=self._delayed_add, args=(event.dest_path,), daemon=True).start()

    def _delayed_add(self, file_path):
        time.sleep(1.0)
        self.queue_manager.add_to_queue(file_path)

    def start(self):
        if self.running:
            return
        for p in self.paths:
            if os.path.exists(p):
                try:
                    self.observer.schedule(self, p, recursive=False)
                    print(f'Watcher active on: {p}')
                except Exception as e:
                    print(f'Failed watching {p}: {e}')
        self.observer.start()
        self.running = True

    def stop(self):
        if self.running:
            self.observer.stop()
            self.observer.join()
            self.running = False
