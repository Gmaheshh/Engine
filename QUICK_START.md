# PRA-GATI Quick Start Guide 🚀

## ✅ Application is Ready!

Your full-stack trading platform is now operational at **http://localhost:5000**

---

## 🎯 Quick Access

| Service | URL | Status |
|---------|-----|--------|
| Frontend (UI) | http://localhost:5000 | ✅ Running |
| Backend API | http://localhost:8000 | ✅ Running |
| MongoDB | localhost:27017 | ✅ Running |

---

## 🔑 Essential Commands

### Check Service Status
```bash
sudo supervisorctl status
```

### Restart Services
```bash
# Restart everything
sudo supervisorctl restart all

# Restart specific service
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Frontend logs  
tail -f /var/log/supervisor/frontend.out.log

# Error logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```

### Test API
```bash
# Health check
curl http://localhost:8000/health

# Get trading universe
curl http://localhost:8000/universe

# Via proxy
curl http://localhost:5000/api/health
```

---

## 📱 Application Pages

1. **Dashboard** - http://localhost:5000/
2. **Live Signals** - http://localhost:5000/signals
3. **Ranked Signals** - http://localhost:5000/signals/ranked
4. **Market Scanner** - http://localhost:5000/scan
5. **Debug Tool** - http://localhost:5000/debug
6. **Universe** - http://localhost:5000/universe

---

## ⚡ To Enable Real Market Data

Currently showing empty data because Kite Connect credentials are expired.

**Steps to fix:**

1. Get credentials from https://kite.trade/
2. Edit `/app/backend/data/zerodha_client.py`:
   ```python
   API_KEY = "your_new_api_key"
   ACCESS_TOKEN = "your_new_access_token"
   ```
3. Restart backend:
   ```bash
   sudo supervisorctl restart backend
   ```

---

## 🛠️ Development

### Backend (Python)
- Location: `/app/backend/`
- Hot reload: ✅ Enabled
- Add package: `pip install <package>`

### Frontend (React)
- Location: `/app/client/src/`
- Hot reload: ✅ Enabled
- Add package: `cd /app && yarn add <package>`

---

## 📊 Architecture

```
User Browser
    ↓
Node.js Express (Port 5000)
    ↓ (serves React UI)
    ↓ (proxies /api/* →)
    ↓
FastAPI Backend (Port 8000)
    ↓
MongoDB (Port 27017)
```

---

## 🎨 Features Working

✅ Professional dark trading terminal UI
✅ Real-time health monitoring
✅ 206 trading symbols in universe
✅ Signal generation engine
✅ Market scanner
✅ Strategy debugger
✅ Responsive layout
✅ Auto-refresh capability

---

## 🆘 Troubleshooting

**Frontend not loading?**
```bash
sudo supervisorctl restart frontend
```

**Backend not responding?**
```bash
sudo supervisorctl restart backend
tail -f /var/log/supervisor/backend.err.log
```

**Empty signals/data?**
- This is expected without valid Kite Connect credentials
- UI structure works perfectly
- Add real credentials to see live data

---

**Status**: ✅ All Systems Operational
**Access**: http://localhost:5000
