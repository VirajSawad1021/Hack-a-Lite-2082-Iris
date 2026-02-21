import os, sys, traceback
os.chdir(r'C:\Users\Viraj\Downloads\Nex__OS\Crew\backend')
try:
    from google_auth_oauthlib.flow import InstalledAppFlow
    print("Starting OAuth flow...", flush=True)
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json',
        ['https://www.googleapis.com/auth/gmail.modify']
    )
    creds = flow.run_local_server(port=0)
    token_data = creds.to_json()
    with open('token.json', 'w') as f:
        f.write(token_data)
    print("SUCCESS - token.json saved!", flush=True)
    print(f"Token length: {len(token_data)}", flush=True)
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)
