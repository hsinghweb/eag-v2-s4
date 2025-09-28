from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import asyncio
import logging
from ai_agent import main as ai_main
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/api/query', methods=['POST'])
async def handle_query():
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400
            
        logger.info(f"Received query: {query}")
        
        # Run the AI agent with the query
        result = await ai_main(query)
        
        return jsonify({
            'status': 'success',
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    # Make sure the server is accessible from other devices on the network
    app.run(host='0.0.0.0', port=5000, debug=True)
