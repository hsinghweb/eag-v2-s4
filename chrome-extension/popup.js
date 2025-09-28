document.addEventListener('DOMContentLoaded', function() {
  const queryInput = document.getElementById('query-input');
  const submitBtn = document.getElementById('submit-btn');
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');

  // Add some basic styles
  const style = document.createElement('style');
  style.textContent = `
    .result-container {
      margin: 8px 0 0 0;
      padding: 0;
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      text-align: left;
      width: 100%;
    }
    .query-display {
      margin: 0 0 6px 0;
      padding: 6px 8px;
      background: #f0f7ff;
      border-radius: 3px;
      border-left: 2px solid #4285f4;
      color: #202124;
      font-weight: 500;
      text-align: left;
      width: 100%;
      box-sizing: border-box;
    }
    .result-item {
      margin: 0;
      padding: 0;
      background: transparent;
      text-align: left;
      width: 100%;
    }
    .result-item.error {
      background: #ffebee;
      border-left: 2px solid #f44336;
    }
    .label {
      display: inline-block;
      min-width: 50px;
      font-weight: 600;
      color: #1a73e8;
      margin-right: 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: left;
      vertical-align: top;
    }
    .result-value {
      display: inline-block;
      padding: 6px 8px;
      margin: 0;
      background: #f8f9fa;
      border-radius: 3px;
      border-left: 2px solid #34a853;
      color: #202124;
      font-family: 'Roboto Mono', 'Courier New', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-word;
      text-align: left;
      width: calc(100% - 60px);
      box-sizing: border-box;
      vertical-align: top;
    }
    .result-value-inline {
      display: inline;
      padding: 0;
      background: transparent;
      border: none;
      color: inherit;
      font-family: inherit;
    }
    #loader {
      display: none;
      margin: 10px 0;
      color: #666;
    }
    #query-input {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    #submit-btn {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    #submit-btn:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);

  // Handle Enter key in the input field
  queryInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendQuery();
    }
  });

  // Handle button click
  submitBtn.addEventListener('click', sendQuery);

  async function sendQuery() {
    const query = queryInput.value.trim();
    
    if (!query) {
      resultDiv.textContent = 'Please enter a query';
      return;
    }

    // Show loading state
    loader.style.display = 'block';
    resultDiv.textContent = '';
    submitBtn.disabled = true;

    try {
      const response = await fetch('http://localhost:5000/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      let responseText = await response.text();
      let resultData;
      
      // Try to parse the response as JSON
      try {
        // First, try to parse the entire response as JSON
        resultData = JSON.parse(responseText);
        
        // If the response is a string that contains JSON, parse that too
        if (typeof resultData === 'string') {
          try {
            const innerJson = JSON.parse(resultData);
            if (typeof innerJson === 'object' && innerJson !== null) {
              resultData = innerJson;
            }
          } catch (e) {
            // If inner parse fails, keep the original resultData
            console.log('Inner JSON parse failed, using as-is');
          }
        }
      } catch (e) {
        console.error('Error parsing JSON:', e);
        // If it's not valid JSON, display as plain text
        resultDiv.innerHTML = `
          <div class="result-container">
            <div class="query-display">Query: ${query}</div>
            <div class="result-item">
              <div class="result-label">Result</div>
              <div class="result-value">${responseText}</div>
            </div>
          </div>
        `;
        return;
      }
      
      try {
        let displayHTML = '';
        
        // If we have a query and result, display them with clear labels
        if (resultData.query && resultData.result) {
          displayHTML = `
            <div class="result-container">
              <div class="query-display">
                <span class="label">Query:</span>
                <span class="result-value-inline">${resultData.query}</span>
              </div>
              <div class="result-item">
                <span class="label">Result:</span>
                <span class="result-value">${resultData.result}</span>
              </div>
            </div>
          `;
        } 
        // If we just have a result
        else if (resultData.result) {
          // Clean up the result if it contains Query/Result prefixes
          let cleanResult = resultData.result;
          if (cleanResult.includes('Query:') && cleanResult.includes('Result:')) {
            cleanResult = cleanResult.split('Result:')[1]?.trim() || cleanResult;
          }
          displayHTML = `
            <div class="result-container">
              <div class="result-item">
                <span class="label">Result:</span>
                <span class="result-value">${cleanResult}</span>
              </div>
            </div>
          `;
        }
        // Fallback to showing raw data
        else {
          displayHTML = `
            <div class="result-container">
              <div class="result-item">
                <pre>${JSON.stringify(resultData, null, 2)}</pre>
              </div>
            </div>
          `;
        }
        
        // Display the formatted HTML
        resultDiv.innerHTML = displayHTML;
        
      } catch (e) {
        console.error('Error formatting response:', e);
        resultDiv.textContent = 'Error: Could not format the response';
      }
      
    } catch (error) {
      console.error('Error:', error);
      resultDiv.textContent = 'Failed to connect to the Math Agent server. Make sure the server is running.';
    } finally {
      // Hide loading state and re-enable button
      loader.style.display = 'none';
      submitBtn.disabled = false;
    }
  }
});
