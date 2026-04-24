# Second Serve Frontend

Static HTML/CSS/JavaScript frontend for the Second Serve food donation platform.

## Quick Start

1. **Open in browser:**
```bash
# Simply open index.html in your browser
start index.html
```

Or serve locally:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (with http-server)
npx http-server
```

2. **Configure backend API:**

Edit `script/env-config.js`:
```javascript
const ENV_CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api', // Change to your backend URL
    ...
}
```

Or set in browser console:
```javascript
localStorage.setItem('apiBaseUrl', 'https://your-backend-url/api');
location.reload();
```

## Deploy to Netlify

1. Connect this repo to Netlify
2. Configure build settings:
   - Base directory: `.`
   - Build command: (leave empty)
   - Publish directory: `.`
3. Add environment variable:
   - `BACKEND_URL` = your-backend-url (optional, for redirects)
4. Deploy

## File Structure

```
frontend/
├── *.html              # All HTML pages (index, login, donate, etc.)
├── script/             # JavaScript files
│   ├── api-config.js   # API endpoints configuration
│   ├── api-utils.js    # API helper functions
│   ├── env-config.js   # Environment configuration
│   └── *.js            # Page-specific handlers
├── style/              # CSS stylesheets
│   └── *.css           # Component and page styles
├── netlify.toml        # Netlify deployment config
└── README.md           # This file
```

## Pages

- `index.html` - Homepage with featured donations
- `login.html` - User login
- `signup.html` - User registration
- `donate.html` - Create a food donation
- `find-ngo.html` - Find nearby NGOs
- `volunteer.html` - Volunteer information
- `heart.html` - Second Smile donations (non-food items)
- `viewer-dashboard.html` - User dashboard
- `ngo-dashboard.html` - NGO dashboard
- `donor-dashboard.html` - Donor dashboard
- `admin-dashboard.html` - Admin panel

## Features

✅ Food donation listing and creation
✅ NGO discovery and mapping
✅ User authentication
✅ Dashboard for donors and NGOs
✅ Real-time stats
✅ Location-based search
✅ Responsive design
✅ Dark mode support

## Backend Integration

The frontend automatically connects to the backend via `/api` prefix when deployed on Netlify, using the `netlify.toml` redirect rules. For local development, set the API URL manually in `env-config.js`.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

See LICENSE file in root directory
# secondserve-frontend
