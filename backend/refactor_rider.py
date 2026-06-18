import os
import glob
import re

files_to_update = glob.glob('src/controllers/*.js') + glob.glob('src/services/*.js')

replacements = [
    (r'\brider_delivery_jobs\b', '"DeliveryJob"'),
    (r'\brider_delivery_partners\b', '"Rider"'),
    (r'\brider_delivery_request_offers\b', '"DeliveryOffer"'),
    (r'\brider_job_tracking\b', '"DeliveryTracking"'),
    (r'\brider_refresh_tokens\b', '"RiderToken"'),
]

for filepath in files_to_update:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    for old, new in replacements:
        content = re.sub(old, new, content)
        
    # Remove rider_job_status_logs inserts
    # It usually looks like: await client.query(`INSERT INTO rider_job_status_logs ...`, [...]);
    content = re.sub(
        r'await\s+(client|riderQuery)\.(query|query)\(\s*`?INSERT\s+INTO\s+rider_job_status_logs[^;]+;\s*',
        '',
        content,
        flags=re.DOTALL | re.MULTILINE
    )

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
