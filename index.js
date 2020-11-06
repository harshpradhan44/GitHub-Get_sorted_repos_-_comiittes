const express = require('express')
const app = express()
const axios = require('axios')
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config(); 
const PORT = process.env.PORT ;

//Logging
const pino = require('pino')("./logs/info.log");;
const expressPino = require("express-pino-logger")({
    logger: pino
});

//Including ENV file

app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(expressPino);

const ACCESS_TOKEN = process.env.ACCESS_TOKEN

let n,m,organization

app.get('/', (req, res) => {
    res.send('Hello World');
   });

// Async function which iteratively makes request to organization contaning more than 100 respositories per page
async function getAllRepos(list){
    //List -> Array containing endpoints of all pages
    const promises = list.map(function (item) { 
        return axios.get(item)
        .then(resp => {
                //Sorting top n respository of particular page based on forks and slicing top n 
                const sortedData = resp.data.sort((a, b) => b.forks - a.forks).slice(0,n);

                //Returning top n repository of particular page
                return sortedData
            });
    });

    //Waiting all the asynchronous function to complete
    const TOP_REPOS = Promise.all(promises).then(function (repo) { 

        //Flattening 2D array to 1D
        repo = [].concat.apply([], repo); 

        //Sorting top n respository of all page based on forks and slicing top N
        let sortedData = repo.sort((a, b) => b.forks - a.forks).slice(0,n);

        //Filtering only name and forks and removing all other information
        return sortedData.map(value => {
            return {
                repo_name: value.name,
                forks: value.forks
            }
        })
    });
    //Returning top N repository of all pages
    return TOP_REPOS;
}

// Async function which iteratively makes request to committes contaning more than 100 respositories per page
async function getAllCommit(list){
    //List -> Array containing endpoints of all pages
    const promises = list.map(function (item) { 
        return axios.get(item)
        .then(resp => {
                //Sorting top m respository of particular page based on commits and slicing top m
                const sortedData = resp.data.sort((a, b) => b.contributions - a.contributions).slice(0,m);

                //Returning top m commits
                return sortedData
            });
    });

    //Waiting all the asynchronous function to complete
    const TOP_COMMIT = Promise.all(promises).then(function (repo) { 

        //Flattening 2D array to 1D
        repo = [].concat.apply([], repo); 

        //Sorting top m committees of all page based on commits and slicing top M
        let sortedData = repo.sort((a, b) => b.contributions - a.contributions).slice(0,m);

        //Filtering only name and commits and removing all other information
        return sortedData.map(value => {
            return {
                committees: value.login,
                commits : value.contributions
            }
        })
    });

    //Returning top M commit of a user
    return TOP_COMMIT;
}


// Async function which iteratively makes request to all committees
async function getCommittees(repoData)
{
    const test = repoData.map(function (item) { 
        //Making GitHub API calls to get committees   
        return axios.get(`https://api.github.com/repos/${organization}/${item.repo_name}/contributors?per_page=100&access_token=${ACCESS_TOKEN}`)
    .then(async resp => {
            const committerLink = resp.headers.link
            let sortedCommit
            if(committerLink)
            {
                const contribPages = parseInt(committerLink.split(",")[1].split(">")[0].split("&page=")[1])
                let allContrib = []
                for(let j=1;j<contribPages+1;j++)
                {
                    allContrib.push(`https://api.github.com/repos/${organization}/${item.repo_name}/contributors?per_page=100&page=${j}&access_token=${ACCESS_TOKEN}`)
                }
                sortedCommit = await getAllCommit(allContrib)

            }
            //if there is only a single page of contibutors
            else{

                sortedCommit = resp.data.sort((a, b) => b.contributions - a.contributions).slice(0,m);

                sortedCommit = sortedCommit.map(value=>{
                    return {
                        committes : value.login,
                        commits : value.contributions
                    }
                })
            }
            return sortedCommit =[{"repo":item.repo_name,"forks":item.forks},sortedCommit]

        }).catch(error=>{
            console.log("Error retrieving committees")
        })
            
    });    
    return test;
}


//Repos endpoint
app.post('/repos', (req, res) => {
    organization = req.body.org
    n = req.body.n
    m = req.body.m
    console.log(organization+" "+n+" "+m)
    //Empty request without organization name
    if (!organization){
        return res.json({"ERROR": "Oganization name not found. Please enter valid github organization name"})
    }

    // Response time start time
    let start_time = new Date().getTime();

    //Using GitHub API
    axios.get(`https://api.github.com/orgs/${organization}/repos?per_page=100&access_token=${ACCESS_TOKEN}`)
    .then(async resp => {
            const link = resp.headers.link 
            // Getting next pages (if exist)
            if(link){ // Organization with more than 1 page

                //Extracting total number of pages in the organization
                const totalPages = parseInt(link.split(",")[1].split(">")[0].split("&page=")[1]) 
                const allRepo = []
                // Endpoints for all the pages of the organization
                for(let i=1; i<totalPages+1; i++){
                    allRepo.push(`https://api.github.com/orgs/${organization}/repos?per_page=100&page=${i}&access_token=${ACCESS_TOKEN}`);
                }

                // Collecting and sorting all the repos based on forks
                const repoData = await getAllRepos(allRepo)

                // Collecting and sorting all the committees based on repos
                const committeeData = await getCommittees(repoData);

                // Returning results and response time
                Promise.all(committeeData).then(committes=>{

                    return res.json({"results":committes, "Time elapsed since queuing the request(in ms):" : new Date().getTime() - start_time})
                }).catch(err=>{
                    res.json({"error":err})
                })

            }else{ // Organization with only 1 page

                //Sorting data based on forks and slicing top n
                let sortedData = resp.data.sort((a, b) => b.forks - a.forks).slice(0,n);
                
                //Filtering only name and forks and removing all other information
                sortedData = sortedData.map(value => {
                    return {
                        repo_name: value.name,
                        forks: value.forks
                    }
                })

                // Collecting and sorting all the committees based on repos
                const committeeData = await getCommittees(sortedData)
                 // Returning results and response time
                Promise.all(committeeData).then(comittes=>
                    {
                        return res.json({"result":comittes, "Time elapsed since queuing the request(in ms):" : new Date().getTime() - start_time})
                    }).catch(err=>
                        {
                            res.json({"Error":" Some Error Occured!","name":err})
                        })        
            }
        })
        .catch(error => {
            // No organization with given found
            res.json({"error":error,"TOP_REPOS": "No such organization found!"})
        });
       
})

app.listen(PORT, ()=> console.log(`Server listening on PORT:${PORT}`))

