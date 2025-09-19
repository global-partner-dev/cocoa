import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadTestQRCode } from '@/utils/testQRCode';
import { QrCode, Download } from 'lucide-react';

const QRCodeTest = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    try {
      await downloadTestQRCode();
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="w-5 h-5 mr-2" />
          QR Code Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Test the QR code generation functionality. This will generate a sample QR code and download it.
        </p>
        <Button 
          onClick={handleGenerateQR}
          disabled={isGenerating}
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Test QR Code'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QRCodeTest;