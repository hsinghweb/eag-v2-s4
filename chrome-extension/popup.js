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

      const resultData = await response.json();
      
      // Create the result container
      const resultContainer = document.createElement('div');
      resultContainer.className = 'result-container';
      
      // Add the query display
      const queryDisplay = document.createElement('div');
      queryDisplay.className = 'query-display';
      queryDisplay.textContent = `Query: ${query}`;
      resultContainer.appendChild(queryDisplay);
      
      // Add the result items
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      
      let resultHTML = `
        <div class="result-item">
          <div class="result-label">Result</div>
          <div class="result-value">${resultData.result || 'No result'}</div>
        </div>
        <div class="result-item">
          <div class="result-label">PowerPoint Status</div>
          <div class="result-value">${resultData.powerpoint || 'N/A'}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Email Status</div>
          <div class="result-value">${resultData.email || 'N/A'}</div>
        </div>
      `;
      
      if (resultData.error) {
        resultHTML += `
          <div class="result-item error">
            <div class="result-label">Error</div>
            <div class="result-value">${resultData.error}</div>
          </div>
        `;
      }
      
      resultItem.innerHTML = resultHTML;
      resultContainer.appendChild(resultItem);
      resultDiv.appendChild(resultContainer);
      
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
