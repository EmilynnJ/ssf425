# AWS Amplify Deployment Guide

## Prerequisites
1. Make sure you have an AWS account
2. Install and configure the AWS CLI
3. Install the Amplify CLI: `npm install -g @aws-amplify/cli`

## Environment Variables
Set up the following environment variables in the AWS Amplify Console:

- `DATABASE_URL`: Your PostgreSQL database URL
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe public key (used on the client side)
- `MUX_TOKEN_ID`: Your MUX Token ID
- `MUX_TOKEN_SECRET`: Your MUX Token Secret
- `MUX_WEBHOOK_SECRET`: Your MUX Webhook Secret
- `SESSION_SECRET`: A random string for session encryption

## Deployment Steps

### Using the AWS Amplify Console (Recommended)
1. Go to the AWS Amplify Console
2. Choose "Deploy without Git provider" or connect to your GitHub repository
3. Select the branch to deploy
4. Configure build settings (the provided `amplify.yml` file should be detected automatically)
5. Add the required environment variables
6. Deploy the application

### Using the Amplify CLI
1. Initialize Amplify in your project: `amplify init`
2. Add hosting: `amplify add hosting`
3. Choose "Manual deployment"
4. Deploy the app: `amplify publish`

## Post-Deployment Steps
1. Configure custom domains if needed
2. Set up SSL certificates
3. Configure redirects if necessary
4. Test the application thoroughly

## Monitoring and Troubleshooting
- Check the Amplify Console for build and deployment logs
- Monitor application logs in CloudWatch
- Set up alerts for any critical issues

## Important Notes
- The application is configured to use an environment variable for the database connection
- Make sure all environment variables are properly set before deployment
- For production, ensure your database is properly secured