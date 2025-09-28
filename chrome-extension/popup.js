document.addEventListener('DOMContentLoaded', function() {
  const queryInput = document.getElementById('query-input');
  const submitBtn = document.getElementById('submit-btn');
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');

  // Add some basic styles
  const style = document.createElement('style');
  style.textContent = `
    .result-container {
      margin-top: 15px;
      font-family: Arial, sans-serif;
    }
    .query-display {
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
    }
    .result-item {
      margin-bottom: 8px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .result-item.error {
      background: #ffebee;
      border-left: 3px solid #f44336;
    }
    .result-label {
      font-weight: bold;
      color: #555;
      margin-bottom: 3px;
    }
    .result-value {
      color: #333;
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
        // Create a clean text response
        let displayText = '';
        
        // Check if result is a string that contains JSON
        let resultObj = resultData;
        if (typeof resultData.result === 'string') {
          try {
            resultObj = JSON.parse(resultData.result);
          } catch (e) {
            // If parsing fails, use the original resultData
            resultObj = resultData;
          }
        }
        
        // Add each field on a new line with UPPERCASE labels
        if (resultObj.result !== undefined) {
          displayText += `RESULT: ${resultObj.result}\n`;
        }
        
        if (resultObj.powerpoint) {
          displayText += `PPT: ${resultObj.powerpoint}\n`;
        }
        
        if (resultObj.email) {
          displayText += `EMAIL: ${resultObj.email}\n`;
        }
        
        // If we didn't find any fields, show the raw response
        if (displayText === '') {
          displayText = typeof resultData === 'string' ? resultData : JSON.stringify(resultData, null, 2);
        } else {
          // Remove the last newline
          displayText = displayText.trim();
        }
        
        // Display the formatted text
        resultDiv.textContent = displayText;
        
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
