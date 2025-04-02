import crypto from 'crypto';

// TRTC credentials
const TRTC_APP_ID = 70000694;
const TRTC_SDK_SECRET = '5bfcb1aaa6a937859a50aa7dca3dcca621639edb66a0b52418d908d02874ea7c';

/**
 * Generates a UserSig for authenticating with TRTC
 * 
 * @param userId The user ID (must be a string of ASCII chars no longer than 32 bytes)
 * @param expireTime The expiration time in seconds, default is 86400 (24 hours)
 * @returns The generated UserSig
 */
export function generateUserSig(userId: string, expireTime: number = 86400): string {
  const currentTime = Math.floor(Date.now() / 1000);
  const sigExpire = currentTime + expireTime;
  
  // Construct the sig info JSON
  const sigInfo = {
    'TLS.ver': '2.0',
    'TLS.identifier': userId,
    'TLS.sdkappid': TRTC_APP_ID,
    'TLS.expire': sigExpire,
    'TLS.time': currentTime
  };
  
  // Generate the sig string
  const sigString = Buffer.from(JSON.stringify(sigInfo)).toString('base64');
  
  // Generate the signature
  const hmac = crypto.createHmac('sha256', TRTC_SDK_SECRET);
  const signature = hmac.update(sigString).digest('base64');
  
  // Construct the final UserSig
  const userSig = {
    'TLS.sig': signature,
    ...sigInfo
  };
  
  // Base64 encode and URL encode
  return encodeURIComponent(Buffer.from(JSON.stringify(userSig)).toString('base64'));
}

/**
 * Generates room parameters for TRTC connection
 * 
 * @param userId The user ID
 * @param roomId The room ID
 * @returns Room parameters needed for TRTC connection
 */
export function generateRoomParams(userId: string, roomId: string) {
  return {
    sdkAppId: TRTC_APP_ID,
    userId,
    userSig: generateUserSig(userId),
    roomId
  };
}

export default {
  generateUserSig,
  generateRoomParams,
  TRTC_APP_ID
};