$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM"
$headers = @{
    "X-N8N-API-KEY" = $apiKey
}

$workflowIds = @("m5wmXXTYAqLiRM9c", "88zOQbdJAT7DOaET", "QjJqgqK9HzISzMhE")

foreach ($wfId in $workflowIds) {
    Write-Host "`n==============================================="
    Write-Host "Fetching Executions for Workflow: $wfId"
    Write-Host "==============================================="
    
    try {
        # Fetch the last 3 executions of any status
        $uri = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/executions?workflowId=$wfId&limit=3"
        $response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
        $execs = $response.data
        
        if ($execs -and $execs.Count -gt 0) {
            foreach ($ex in $execs) {
                Write-Host "Execution ID: $($ex.id)"
                Write-Host "Status      : $($ex.status)"
                Write-Host "Started     : $($ex.startedAt)"
                Write-Host "Finished    : $($ex.stoppedAt)"
                
                # Fetch detailed execution data to find the exact node error
                $detailUri = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/executions/$($ex.id)"
                $detail = Invoke-RestMethod -Uri $detailUri -Method Get -Headers $headers
                
                if ($detail.data -and $detail.data.resultData) {
                    $errorInfo = $detail.data.resultData.error
                    if ($errorInfo) {
                        Write-Host "Error Node  : $($errorInfo.nodeName)"
                        Write-Host "Error Msg   : $($errorInfo.message)"
                        Write-Host "Error Stack : $($errorInfo.stack)"
                    } else {
                        # Look for failed nodes in runData
                        $runData = $detail.data.resultData.runData
                        if ($runData) {
                            $failedNodes = @()
                            foreach ($nodeName in $runData.PSObject.Properties.Name) {
                                $nodeRuns = $runData.$nodeName
                                foreach ($run in $nodeRuns) {
                                    if ($run.error) {
                                        $failedNodes += "$nodeName: $($run.error.message)"
                                    }
                                }
                            }
                            if ($failedNodes.Count -gt 0) {
                                Write-Host "Failed Nodes: $($failedNodes -join ' | ')"
                            } else {
                                Write-Host "No node errors found in runData."
                            }
                        }
                    }
                }
                Write-Host "-----------------------------------------------"
            }
        } else {
            Write-Host "No recent executions found."
        }
    } catch {
        Write-Host "Error fetching executions for $wfId`: $_"
    }
}
