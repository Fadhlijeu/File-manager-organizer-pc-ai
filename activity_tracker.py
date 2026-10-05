# activity_tracker.py
"""
Activity Tracker - Real-time Persistent Telemetry & Event Store
All metrics start from 0 for today. No fake mockups.
"""

import os
import json
import time
from datetime import datetime

ACTIVITY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'activity_log.json')

class ActivityTracker:
    def __init__(self):
        self.file_path = ACTIVITY_FILE
        self.data = self._load()

    def _load(self):
        today_str = datetime.now().strftime('%Y-%m-%d')
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    d = json.load(f)
                    if d.get('date') == today_str:
                        return d
            except Exception:
                pass
        
        # Fresh initialization for today starting at 0
        fresh = {
            'date': today_str,
            'total_organized': 0,
            'total_io_events': 0,
            'operations': {
                'move': 0,
                'rename': 0,
                'ai_scan': 0,
                'delete': 0,
                'protected_blocks': 0
            },
            'hourly_buckets': [0] * 15,
            'events': []
        }
        self._save(fresh)
        return fresh

    def _save(self, data=None):
        if data is None:
            data = self.data
        try:
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving activity log: {e}")

    def record_event(self, op_type, title, desc, icon='activity', target_path=''):
        today_str = datetime.now().strftime('%Y-%m-%d')
        if self.data.get('date') != today_str:
            self.data = self._load()

        now_str = datetime.now().strftime('%H:%M')
        event_item = {
            'id': f'ev_{int(time.time()*1000)}',
            'type': op_type,
            'title': title,
            'desc': desc,
            'time': now_str,
            'icon': icon,
            'path': target_path,
            'timestamp': time.time()
        }

        # Update counters
        self.data['total_io_events'] += 1
        if op_type == 'move':
            self.data['total_organized'] += 1
            self.data['operations']['move'] += 1
        elif op_type == 'rename':
            self.data['operations']['rename'] += 1
        elif op_type == 'ai_scan':
            self.data['operations']['ai_scan'] += 1
        elif op_type == 'delete':
            self.data['operations']['delete'] += 1
        elif op_type == 'protected_block':
            self.data['operations']['protected_blocks'] += 1

        # Current hour bucket index (0-14 mapped across daytime)
        hr = datetime.now().hour
        bucket_idx = min(14, max(0, int((hr / 24.0) * 15)))
        self.data['hourly_buckets'][bucket_idx] += 1

        # Prepend event
        self.data['events'].insert(0, event_item)
        if len(self.data['events']) > 100:
            self.data['events'] = self.data['events'][:100]

        self._save()
        return event_item

    def get_summary(self):
        today_str = datetime.now().strftime('%Y-%m-%d')
        if self.data.get('date') != today_str:
            self.data = self._load()

        return {
            'date': self.data['date'],
            'total_organized': self.data['total_organized'],
            'total_io_events': self.data['total_io_events'],
            'operations': self.data['operations'],
            'chart_bars': self.data['hourly_buckets'],
            'events': self.data['events'][:20]
        }

activity_tracker = ActivityTracker()
