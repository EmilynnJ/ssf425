import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Load Stripe outside of component to avoid recreating it on renders
let stripePromise: Promise<any> | null = null;

// Initialize Stripe
const getStripe = async () => {
  if (!stripePromise) {
    // Fetch public key from server
    const res = await fetch('/api/stripe/config');
    const { publishableKey } = await res.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  amount: number;
}

// Checkout form component
function CheckoutForm({ clientSecret, onSuccess, onCancel, amount }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin, // Redirect not actually used for this flow
      },
      redirect: 'if_required',
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: 'Payment failed',
        description: error.message || 'Something went wrong with your payment.',
        variant: 'destructive',
      });
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast({
        title: 'Payment successful',
        description: 'Thank you for your payment!',
      });
      if (onSuccess) onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <div className="flex justify-between mt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            `Pay $${(amount / 100).toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
}

interface StripeCheckoutProps {
  amount: number;
  readingId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Main Stripe checkout component
export function StripeCheckout({ amount, readingId, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('POST', '/api/stripe/create-payment-intent', {
          amount,
          readingId
        });
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to initialize payment.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentIntent();
  }, [amount, readingId, toast]);

  if (isLoading || !clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secure Payment</CardTitle>
        <CardDescription>Complete your payment to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={getStripe()} options={{ clientSecret }}>
          <CheckoutForm 
            clientSecret={clientSecret} 
            onSuccess={onSuccess} 
            onCancel={onCancel}
            amount={amount}
          />
        </Elements>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Your payment is secure and encrypted.
      </CardFooter>
    </Card>
  );
}