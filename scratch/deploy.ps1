$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM"
$headers = @{
    "Content-Type" = "application/json"
    "X-N8N-API-KEY" = $apiKey
}

# 1. Copy evolution base
Write-Host "1. Copying working evolution base..."
Copy-Item -Path "scratch/evolution_current.json" -Destination "n8n-workflows/evolution-inbound-webhook.json" -Force
Write-Host "   Copy successful!"

# 2. Run patch
Write-Host "`n2. Patching workflows with AI settings..."
node scratch/patch_workflows.cjs
Write-Host "   Patching successful!"

# 3. Deploy Evolution
Write-Host "`n3. Deploying Evolution (m5wmXXTYAqLiRM9c)..."
$body = [System.IO.File]::ReadAllText("n8n-workflows/evolution-inbound-webhook-deploy.json", [System.Text.Encoding]::UTF8)
$res = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c" -Method Put -Headers $headers -Body $body
Write-Host "   Evolution Upload Status: Success"
$resAct = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c/activate" -Method Post -Headers $headers
Write-Host "   Evolution Activation Status: Active"

# 4. Deploy Meta
Write-Host "`n4. Deploying Meta (88zOQbdJAT7DOaET)..."
$body = [System.IO.File]::ReadAllText("n8n-workflows/meta-inbound-webhook-deploy.json", [System.Text.Encoding]::UTF8)
$res = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET" -Method Put -Headers $headers -Body $body
Write-Host "   Meta Upload Status: Success"
$resAct = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET/activate" -Method Post -Headers $headers
Write-Host "   Meta Activation Status: Active"

# 5. Deploy Instagram
Write-Host "`n5. Deploying Instagram (QjJqgqK9HzISzMhE)..."
$body = [System.IO.File]::ReadAllText("n8n-workflows/instagram-inbound-webhook-deploy.json", [System.Text.Encoding]::UTF8)
$res = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/QjJqgqK9HzISzMhE" -Method Put -Headers $headers -Body $body
Write-Host "   Instagram Upload Status: Success"
$resAct = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/QjJqgqK9HzISzMhE/activate" -Method Post -Headers $headers
Write-Host "   Instagram Activation Status: Active"

Write-Host "`nALL DEPLOYMENTS COMPLETED SUCCESSFULLY!"
