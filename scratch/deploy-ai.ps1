$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM"
$headers = @{
    "Content-Type" = "application/json"
    "X-N8N-API-KEY" = $apiKey
}
$n8nUrl = "https://n8n-n8n.rh3fr2.easypanel.host"

Write-Host "1. Building Central AI Agent Workflow JSON..."
node scratch/build_ai_workflow.cjs

Write-Host "`n2. Patching Channel Webhooks to use Central Agent..."
node scratch/patch_workflows.cjs

Write-Host "`n3. Deploying Central AI Agent..."
$aiBody = [System.IO.File]::ReadAllText("n8n-workflows/central-ai-agent-deploy.json", [System.Text.Encoding]::UTF8)

# Check if Central AI Agent already exists
$existingWorkflows = Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows" -Method Get -Headers $headers
$centralWorkflow = $existingWorkflows.data | Where-Object { $_.name -eq "Central AI Agent" }

if ($centralWorkflow) {
    Write-Host "   Updating existing Central AI Agent (ID: $($centralWorkflow.id))..."
    $resAi = Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/$($centralWorkflow.id)" -Method Put -Headers $headers -Body $aiBody
    $aiId = $centralWorkflow.id
} else {
    Write-Host "   Creating new Central AI Agent..."
    $resAi = Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows" -Method Post -Headers $headers -Body $aiBody
    $aiId = $resAi.id
}
Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/$aiId/activate" -Method Post -Headers $headers
Write-Host "   Central AI Agent is ACTIVE."

Write-Host "`n4. Deploying Evolution Webhook..."
$bodyE = [System.IO.File]::ReadAllText("n8n-workflows/evolution-inbound-webhook-deploy.json", [System.Text.Encoding]::UTF8)
Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/m5wmXXTYAqLiRM9c" -Method Put -Headers $headers -Body $bodyE
Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/m5wmXXTYAqLiRM9c/activate" -Method Post -Headers $headers
Write-Host "   Evolution Uploaded & Active."

Write-Host "`n5. Deploying Meta Webhook..."
$bodyM = [System.IO.File]::ReadAllText("n8n-workflows/meta-inbound-webhook-deploy.json", [System.Text.Encoding]::UTF8)
Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/88zOQbdJAT7DOaET" -Method Put -Headers $headers -Body $bodyM
Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/88zOQbdJAT7DOaET/activate" -Method Post -Headers $headers
Write-Host "   Meta Uploaded & Active."

Write-Host "`n6. Deploying Instagram Webhook..."
$bodyI = [System.IO.File]::ReadAllText("n8n-workflows/instagram-inbound-webhook-deploy.json", [System.Text.Encoding]::UTF8)
Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/QjJqgqK9HzISzMhE" -Method Put -Headers $headers -Body $bodyI
Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/QjJqgqK9HzISzMhE/activate" -Method Post -Headers $headers
Write-Host "   Instagram Uploaded & Active."

Write-Host "`nALL DEPLOYMENTS COMPLETED SUCCESSFULLY!"
