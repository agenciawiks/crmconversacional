# Test script for inbound webhooks using PowerShell Invoke-RestMethod (bypasses Node.js network hangs)

$headers = @{
    "Content-Type" = "application/json"
}

# 1. Testing Evolution Webhook
Write-Host "Testing Evolution Webhook POST..."
$evoBody = @{
    event = "messages.upsert"
    instance = "SuporteConn" # Use the instance name from your CRM connection if different
    data = @{
        key = @{
            remoteJid = "5511988888888@s.whatsapp.net"
            fromMe = $false
            id = "EVO-MOCK-TEST-9999"
        }
        pushName = "Caio Teste Evolution"
        message = @{
            conversation = "Oi, gostaria de saber os serviços?"
        }
        messageTimestamp = [int]([DateTimeOffset]::Now.ToUnixTimeSeconds())
    }
} | ConvertTo-Json -Depth 100 -Compress

try {
    $res = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/webhook/webhook/evolution" -Method Post -Headers $headers -Body $evoBody
    Write-Host "Evolution Response: $res"
} catch {
    Write-Host "Evolution Test Failed: $_"
}

# 2. Testing Meta Webhook
Write-Host "`nTesting Meta Webhook POST..."
$metaBody = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "123456"
            changes = @(
                @{
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "5511999999999"
                            phone_number_id = "4886443e-4996-4d2a-83e1-d96f503e1a28"
                        }
                        contacts = @(
                            @{
                                profile = @{
                                    name = "Caio Teste Meta"
                                }
                                wa_id = "5511999999999"
                            }
                        )
                        messages = @(
                            @{
                                from = "5511999999999"
                                id = "wamid.HBgNNTUxMTk5OTk5OTk5OQcGPVE1NTExOTk5OTk5OTk5AA=="
                                timestamp = "$([int]([DateTimeOffset]::Now.ToUnixTimeSeconds()))"
                                text = @{
                                    body = "Oi, quero saber mais sobre os planos"
                                }
                                type = "text"
                            }
                        )
                    }
                    field = "messages"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 100 -Compress

try {
    $res = Invoke-RestMethod -Uri "https://n8n-n8n.rh3fr2.easypanel.host/webhook/webhook/meta" -Method Post -Headers $headers -Body $metaBody
    Write-Host "Meta Response: $res"
} catch {
    Write-Host "Meta Test Failed: $_"
}
