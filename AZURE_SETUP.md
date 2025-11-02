# Azure OpenAI Setup Guide for FitPal

FitPal uses Azure OpenAI's GPT-4o model to provide intelligent food analysis, recipe suggestions, and dietary insights specifically for Indian cuisine.

## Prerequisites
- An Azure subscription (you can get a [free trial](https://azure.microsoft.com/free/))
- Access to Azure OpenAI (you may need to [request access](https://aka.ms/oai/access))

## Step-by-Step Setup

### 1. Create an Azure OpenAI Resource

1. Go to the [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Azure OpenAI"
4. Click "Create"
5. Fill in the required information:
   - **Subscription**: Select your subscription
   - **Resource Group**: Create new or use existing
   - **Region**: Choose a region (e.g., East US, West Europe)
   - **Name**: Give your resource a unique name (e.g., `fitpal-openai`)
   - **Pricing Tier**: Select Standard S0
6. Click "Review + Create", then "Create"
7. Wait for deployment to complete

### 2. Deploy the GPT-4o Model

1. Once the resource is created, go to the resource
2. Click "Go to Azure OpenAI Studio" or navigate to [https://oai.azure.com](https://oai.azure.com)
3. Select your resource
4. Go to **Deployments** in the left menu
5. Click **+ Create new deployment**
6. Configure the deployment:
   - **Model**: Select `gpt-4o` (or latest available)
   - **Deployment name**: `gpt-4o` (you can use any name)
   - **Model version**: Auto-update to default
7. Click **Create**

### 3. Get Your API Keys and Endpoint

1. In the Azure Portal, go to your Azure OpenAI resource
2. Click on **Keys and Endpoint** in the left menu
3. Copy the following information:
   - **KEY 1** or **KEY 2** (either one works)
   - **Endpoint** (looks like `https://your-resource-name.openai.azure.com/`)
   - Note your **Deployment name** from step 2

### 4. Configure FitPal

1. In your FitPal project directory, create a `.env` file:
```bash
touch .env
```

2. Add your Azure OpenAI credentials:
```env
# Your Azure OpenAI endpoint (from step 3)
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com

# Your API key (from step 3)
VITE_AZURE_OPENAI_KEY=your_api_key_here

# Your deployment name (from step 2)
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

3. Save the file and restart your development server:
```bash
npm run dev
```

## Testing Your Configuration

1. Register/login to FitPal
2. Go to the "Log Food" page
3. Try searching for an Indian food like "dosa" or "paneer tikka"
4. If configured correctly, the AI should provide nutritional information

## Troubleshooting

### Error: "Azure OpenAI credentials not configured"
- Make sure your `.env` file is in the root directory
- Verify all three environment variables are set
- Restart the development server after creating/editing `.env`

### Error: "API key is invalid"
- Double-check you copied the key correctly
- Make sure there are no extra spaces
- Try using KEY 2 if KEY 1 doesn't work

### Error: "Deployment not found"
- Verify the deployment name matches exactly
- Make sure the deployment is "Succeeded" in Azure OpenAI Studio

### Error: "Access denied" or 403
- Verify you have access to Azure OpenAI service
- Check if your Azure subscription is active
- Ensure the resource is in a supported region

## Cost Considerations

Azure OpenAI charges based on usage:
- **GPT-4o**: ~$5 per 1M input tokens, ~$15 per 1M output tokens
- Each food search uses approximately 500-1000 tokens
- A typical user might use $1-5 per month of moderate usage

**Free Tier**: Azure offers $200 credit for the first 30 days.

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Already included in `.gitignore`
   
2. **Keep your API keys secure**
   - Don't share them publicly
   - Rotate keys if compromised
   
3. **For production deployment**:
   - Use environment variables in your hosting platform
   - Consider using Azure Key Vault for key management

## Alternative: Local Development Without Azure OpenAI

If you don't have Azure OpenAI access, FitPal includes mock data for development:
- Food searches will return sample Indian foods
- Recipe suggestions will show example recipes
- The app will still function for manual data entry

To use without Azure OpenAI, simply don't configure the `.env` file or leave the values empty.

## Need Help?

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure OpenAI Quickstart](https://learn.microsoft.com/en-us/azure/ai-services/openai/quickstart)
- [Request Azure OpenAI Access](https://aka.ms/oai/access)
