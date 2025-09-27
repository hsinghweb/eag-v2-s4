import os
import re
import logging
from dotenv import load_dotenv

import google.generativeai as genai
import tools
import os

load_dotenv()

logging.basicConfig(
    filename='math_agent.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class AI_Agent:
    def __init__(self):
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.client = genai.GenerativeModel('gemini-2.5-flash')
        self.system_prompt = """You are a math agent. Respond with EXACTLY ONE of these formats:
        1. FUNCTION_CALL: python_function_name|input
        2. FINAL_ANSWER: [number]

        where python_function_name is one of the following functions:
        1. number_list_to_sum(list) - Adds all numbers in a list
        2. calculate_difference(a, b) - Subtracts b from a
        3. number_list_to_product(list) - Multiplies all numbers in a list 
        4. calculate_division(a, b) - Divides a by b
        5. strings_to_chars_to_int(string) - Converts each character to its ASCII code
        6. int_list_to_exponential_values(list) - Calculates exponential values for each x in list
        7. fibonacci_numbers(n) - Generates first n Fibonacci numbers
        8. calculate_factorial(n) - Returns list of factorials from 0! to n!
        9. calculate_permutation(n, r) - Calculates the number of permutations of n items taken r at a time
        10. calculate_combination(n, r) - Calculates the number of combinations of n items taken r at a time
        11. calculate_salary_for_id(emp_id) - Returns the salary for the given employee id from the SQLite database
        12. calculate_salary_for_name(emp_name) - Returns the salary for the given employee name from the SQLite database
        13. calculate_percentage(percent, number) - Calculates the percentage of a given number.

        

        DO NOT include multiple responses. Give ONE response at a time.
        """

        self.results = {}  # Track previous results

    def execute_function(self, function_call):
        try:
            func_name, param_str = function_call.split('|', 1)
            param_str = re.sub(r'\$result_(\d+)', lambda m: str(self.results.get(f'result_{m.group(1)}', '')), param_str)

            # Attempt to safely evaluate parameters; if NameError occurs treat as raw string
            try:
                param = eval(param_str)
            except NameError:
                # Treat the raw parameter as a simple string (e.g., employee name without quotes)
                param = param_str.strip().strip('"').strip("'")

            function_map = {
                'number_list_to_sum': lambda p: tools.number_list_to_sum(p),
                'calculate_difference': lambda p: tools.calculate_difference(*p if isinstance(p, tuple) else (p[0], p[1])),
                'number_list_to_product': lambda p: tools.number_list_to_product(p),
                'calculate_division': lambda p: tools.calculate_division(*p if isinstance(p, tuple) else (p[0], p[1])),
                'strings_to_chars_to_int': lambda p: tools.strings_to_chars_to_int(p),
                'int_list_to_exponential_values': lambda p: tools.int_list_to_exponential_values(p),
                'fibonacci_numbers': lambda p: tools.fibonacci_numbers(p),
                'calculate_factorial': lambda p: tools.calculate_factorial(p),
                'calculate_permutation': lambda p: tools.calculate_permutation(*p if isinstance(p, tuple) else (p[0], p[1])),
                'calculate_combination': lambda p: tools.calculate_combination(*p if isinstance(p, tuple) else (p[0], p[1])),
                'calculate_salary_for_id': lambda p: tools.calculate_salary_for_id(*p if isinstance(p, tuple) else (p,)),
                'calculate_salary_for_name': lambda p: tools.calculate_salary_for_name(*p if isinstance(p, tuple) else (p,)),
                'calculate_percentage': lambda p: tools.calculate_percentage(*p if isinstance(p, tuple) else (p[0], p[1])),
            }
            
            if func_name not in function_map:
                raise ValueError(f"Unknown function: {func_name}")
                
            return function_map[func_name](param)
            
        except (ValueError, TypeError, SyntaxError) as e:
            # Use a default value 'unknown' if func_name is not defined
            func_name = locals().get('func_name', 'unknown')
            logging.error(f"Error executing function {func_name}: {str(e)}")
            raise ValueError(f"Invalid input for {func_name}: {str(e)}")
        except Exception as e:
            logging.error(f"Unexpected error: {str(e)}")
            raise
        
    def solve(self, query, max_iterations=5):
        context = []
        result = None
        iteration = 0
        iteration_response = []
        last_response = None
        
        logging.info("\n" + "=" * 80 + "\nStarting new execution\n" + "=" * 80)

        # Reset previous results to ensure step numbering starts from 1 for each new solve call
        self.results = {}

        while iteration < max_iterations:
            try:
                logging.info(f"\n--- Iteration {iteration + 1} ---")
                if last_response is None:
                    current_query = query
                else:
                    current_query = query + "\n\n" + " ".join(iteration_response)
                    current_query += "  What should I do next?"
                
                logging.info(f"[LLM] Processing query: {current_query}")
                prompt = f"{self.system_prompt}\n\nQuery: {current_query}\nContext: {context}"
                response = self.client.generate_content(prompt)
                logging.info(f"[LLM] Raw response: {response.text}")
                
                if 'FUNCTION_CALL:' in response.text:
                    function_call = response.text.split('FUNCTION_CALL: ')[1].strip()
                    logging.info(f"[TOOL] Executing function call: {function_call}")
                    
                    try:
                        result = self.execute_function(function_call)
                        step = len(self.results) + 1
                        self.results[f'result_{step}'] = result
                        
                        func_name, params = function_call.split('|', 1)
                        iteration_response.append(
                            f"In the {iteration + 1} iteration you called {func_name} with {params} parameters, "
                            f"and the function returned {result}."
                        )
                        
                        context.append(f"Step {step} result: {result}")
                        last_response = result
                        logging.info(f"[LLM] Updated context: {context}")
                        iteration += 1
                    except ValueError as e:
                        logging.error(f"Function execution error: {str(e)}")
                        return f"Error: {str(e)}"
                        
                elif 'FINAL_ANSWER:' in response.text:
                    final_answer = response.text.split('FINAL_ANSWER: ')[1].strip()
                    try:
                        # Ensure final answer is a valid number
                        final_answer = eval(final_answer.strip('[]'))
                        logging.info(f"[LLM] Final answer: {final_answer}")
                        last_response = final_answer
                        return final_answer
                    except Exception as e:
                        logging.error(f"Error parsing final answer: {str(e)}")
                        return result  # Return the last valid result if parsing fails
                else:
                    return "Error: Invalid response format"
                    
            except Exception as e:
                logging.error(f"Solver error: {str(e)}")
                return f"Error: {str(e)}"
        
        logging.info("\n" + "=" * 80 + "\nExecution completed\n" + "=" * 80)
        return result

if __name__ == "__main__":
    agent = AI_Agent()
    query = input("Enter math query: ")
    logging.info(f"User query received: {query}")
    print(agent.solve(query, 6))