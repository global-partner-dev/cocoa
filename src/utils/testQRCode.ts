import QRCode from 'qrcode';

// Test function to generate a QR code and verify it works
export const testQRCodeGeneration = async () => {
  try {
    const testData = {
      trackingCode: 'CC-2024-123456',
      sampleId: 'test-sample-id',
      contestId: 'test-contest-id',
      contestName: 'Test Contest',
      participantName: 'Test Participant',
      submissionDate: new Date().toISOString(),
      verificationUrl: 'http://localhost:8081/verify/CC-2024-123456'
    };

    // Generate QR code as data URL for testing
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(testData), {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',  // Black dots
        light: '#FFFFFF'  // White background
      },
      errorCorrectionLevel: 'M'
    });

    console.log('QR Code generated successfully!');
    console.log('Data URL length:', qrCodeDataURL.length);
    console.log('QR Code data:', testData);
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating test QR code:', error);
    throw error;
  }
};

// Function to create a downloadable QR code for testing
export const downloadTestQRCode = async () => {
  try {
    const dataURL = await testQRCodeGeneration();
    
    // Create a download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'test-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Test QR code downloaded successfully!');
  } catch (error) {
    console.error('Error downloading test QR code:', error);
  }
};