# GitHub-Get_sorted_repos_-_comiittes

Follow these steps to use my Api:

1. Install all the dependencies, use the following commands:
```
 npm install
 ```
 
 2. Save your access_token in .env file in root directory.
 
 3. To test this API locally on your machine, run this command:
 ```
 node index.js
 ```
 Your console should print: `Listening to the Port:{port_num}`.
 
 4. Now, open Postman (or any similar app), and send a POST request to the "localhost:{PORT_NUMBER}/repos" and send the following fields along with the body:
 ```
  {
   org = "ORGANIZATION_NAME",
   n = "Value_of_N",
   m = "Value_of_M"
  }
  ```
  
  5. You should either get a response back (in json), or an error (depending upon your input).
  
  6. For testing on the actual server, send POST request in the above mentioned format to this->: https://safe-cove-80098.herokuapp.com/repos .
  
  7. Bingo, you have tested my API! Thank you for using my API ;)
