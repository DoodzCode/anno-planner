Problem:

- two human developers want to collaborate using their own A.I. agents
- there is a lack of structure and rules
- what should be the roles of the human?
- how should the A.I. agents and human’s collaborate in an efficient manner
- efficiency would include in this context would mean knowing where the two collaborators are.
- there’s no progress tracking in our project currently

Desired Result:

- clear contribution guidelines
    - clearly defined human roles
    - clearly defined agent roles
        
        clean repo structure
        
    - clear and strict agent guardrails
- organized and detailed development roadmap
- updated tracking on what is currently being worked on

Task:

- develop a plan to address the above problems listed by way if repo documentation and configuration
    - include a development plan for the html development dashboard

Task Details:

main production branch = `origin/main`

main development branch  = `origin/dev` 

human developers work on their own branches cut from `origin/dev`— ex. `origin/ian`

coding agents work on their own git worktrees on the human developers branch

maintain project tracking in-repo with a live artifact html dashboard