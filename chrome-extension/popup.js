document.addEventListener('DOMContentLoaded', function() {
  const queryInput = document.getElementById('query-input');
  const submitBtn = document.getElementById('submit-btn');
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');

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

      const data = await response.json();
      
      if (data.status === 'success') {
        // Display the result
        if (data.result) {
          let displayText = data.result;
          
          // Clean up the display text
          if (typeof displayText === 'string') {
            // Remove any remaining FINAL_ANSWER: prefix and trim
            displayText = displayText.replace(/^FINAL_ANSWER:/i, '').trim();
            // Remove any remaining quotes or brackets
            displayText = displayText.replace(/^["\[\]']+|["\[\]']+$/g, '');
          }
          
          // Set the result with improved formatting
          resultDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">
              ${queryInput.value}
            </div>
            <div style="background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${displayText}
            </div>
          `;
        } else {
          resultDiv.textContent = 'No result returned';
        }
      } else {
        resultDiv.textContent = `Error: ${data.message || 'Unknown error occurred'}`;
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.textContent = `Failed to connect to the Math Agent server. Make sure the server is running.`;
    } finally {
      // Hide loading state
      loader.style.display = 'none';
      submitBtn.disabled = false;
    }
  }
});
