# Streamlets

Like Applets, but for your live streams.  
Streamlets is an Electron-based App that runs locally on your machine to provide certain overlays, or streamlets, you can use in your live streams.
One such streamlet for example would be a chatbox, which nicely displays your chat animated on stream or an Alert box that plays a sound and an animation, everytime someone Follows, Subscribes, or similar.

Development on Streamlets has only just started, but feel free to already suggest features you might want to see in the future.

## Boring Programmer Stuff

The following sections are intended for those who want to contibute on the actual source code of the project or interested in running a pre-alpha version of the app.

### Required Software
Streamlets is being developed in a `Node` 14.17 Environment with `NPM` 6.14 as the Package manager.  
The tech stack consist of `Electron` for the Desktop framework, `Vue` with `Vuetify` for the design framework, `ws` for WebSocket hosting and connections, `Axios` for regular API requests and `Express` to host a webserver for Streamlets. 

### Install Dependencies
```
npm install
```

### Run Project
```
npm run electron:serve
```

### Build Project for a Production environment
Please note that the project is set up for a Windows Build only as of right now.  
As the app is written with Electron, supporting other OSes shouldn't be a problem in the future, it's just not set up for now.
```
npm run electron:build
```

### Lints and fixes files
```
npm run lint
```
