/**
 * Attempt to detect local IP address using WebRTC
 * Returns null if detection fails or mDNS hostname is returned
 * Timeout after 5 seconds
 */
export const getLocalIP = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
    let resolved = false;

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (resolved || !event.candidate) return;

      // Modern browsers: use .address property
      if (event.candidate.address && !event.candidate.address.endsWith('.local')) {
        resolved = true;
        resolve(event.candidate.address);
        pc.close();
        return;
      }

      // Fallback: parse candidate string
      const match = ipRegex.exec(event.candidate.candidate);
      if (match && !match[1].endsWith('.local')) {
        resolved = true;
        resolve(match[1]);
        pc.close();
      }
    };

    // Create data channel and generate offer
    pc.createDataChannel('');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
          pc.close();
        }
      });

    // 5-second timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
        pc.close();
      }
    }, 5000);
  });
};
