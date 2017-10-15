# Monolens POC

This is the proof of concept for MonoLens, a DevOps visualization dashboard.

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

After starting the different components you can hit the web client in your browser at `locahost:3090`. The web page should display the contents of `/tmp/feathers-test.txt` and update live when the file changes. Any component of the the app, the Server, Collector, or the Agent can fail at any time and the connection will be immediately repaired when the component comes back on line, updating the web interface if necessary.
