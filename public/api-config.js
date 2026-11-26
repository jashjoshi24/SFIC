// Configure the API before page scripts initialize their clients.
if (!window.SFIC_API_BASE_URL) {
  window.SFIC_API_BASE_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:5000'
    : 'https://sfic-backend-7957075383.asia-south1.run.app';
}
