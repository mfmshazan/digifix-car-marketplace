# Web Compatibility Notes

## Changes Made for Web Support

### 1. Storage Service (`services/storage.js`)
- Added platform detection to use `localStorage` on web instead of `expo-secure-store`
- SecureStore is not available on web, so we fallback to browser localStorage
- **Security Note**: On web, tokens are stored in localStorage (less secure than mobile Keychain/Keystore)

### 2. Location Service (`services/location.js`)
- Added platform check to skip location permission requests on web
- Location features will be disabled on web platform

### 3. Camera/Image Features
- Camera and signature features may not work on web
- Consider adding web-specific alternatives (file upload, mouse signature)

## Running on Web

```bash
cd mobile
npx expo start --web
```

Or press `w` in the Expo dev menu.

## Known Limitations on Web

1. **No Secure Storage**: Tokens stored in localStorage (visible in DevTools)
2. **No Location Tracking**: GPS features disabled
3. **No Camera**: Photo capture won't work (use file upload instead)
4. **No Push Notifications**: Expo notifications don't work on web
5. **Maps**: react-native-maps doesn't work on web (would need web alternative)

## Recommended Use

- **Mobile (iOS/Android)**: Full feature set with all native capabilities
- **Web**: For testing, admin dashboard, or limited partner management

## Production Deployment

For production web deployment:
- Consider building a separate web admin dashboard
- Or use the mobile app exclusively for delivery partners
- Web version is mainly for development/testing purposes
