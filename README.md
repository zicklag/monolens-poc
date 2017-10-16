# Monolens POC

This is the proof of concept for MonoLens, a DevOps visualization dashboard.

**Note:** This is a *very* quick-and-dirty POC. There is definitely a *large* performance issue with the way that I am pushing filesystem change events to the server ( I am positive that I could do this better but that is not the point of the POC )

## Explanation

This repo demonstrates the core concept behind the MonoLens infrastructure, the server, the collector, and the agent. There is also one final component, the Client. It is just a very rough test of the infrastructure without authentication or any other organization.

### The Server

The Server is the main API of MonoLens. It is what the web client communicates with. It is implemented as a FeathersJS server

### The Collector

The collector is responsible for getting data to the server in the form of widgets. In this POC we don't really have a real concept of widgets, but that is what the job of the collector will be in the final version. There is a different collector for each different kind of data that you want to collect, GitHub, Jira, Jenkins, etc.. Eeach collector type has a corresponding agent type. The Collector post-processes the data sent to it by the Agents.

## The Agent

The agent is utilized by the collector to obtain the raw data. It simply pushes the data to the Collector for storage and processing.

## The client

The client is a statically served Javascript frontend built on top of [OpenMCT](https://github.com/nasa/openmct) and hosted with Express.

## Usage

Take the following steps to start the application.

1. Create the file to monitor
    1. echo "Hello World" > /tmp/feathers-test.txt
2. Start the server
    1. cd ./server
    2. npm start
3. Start the Collector
    1. cd ./collectors/file-collector/collector
    2. npm start
4. Start the Agent
    1. cd ./collectors/filel-collector/agent
    2. node index.js

After starting the different components you can hit the web client in your browser at `locahost:8080`. You should see the OpenMCT interface start up with a Monolens->File Contents object in the sidebar. Selecting it should display a table with the last half hour of states file was in since you started the server. At the bottom you can select Fixed Timespan Mode to scroll back further than a half hour of time.

Any component of the the app, the Server, Collector, or the Agent can fail at any time and the connection will be immediately repaired when the component comes back on line, updating the web interface if necessary.
