# Simple Behavior Tree and Visualization 
You'll be able to find a million versions of behavior trees online. This guide assumes you already have some familiarity with [behavior trees](https://en.wikipedia.org/wiki/Behavior_tree_artificial_intelligence,_robotics_and_control) but they're fairly easy to pick up. This implementation is meant to be simple, fully templatetized(??), and easy to import and customize

## C++ Code 
### Building C++ Code
The C++ code here is just 100 lines of code! Very easy to insert into projects but feel free to experiment in the provided `Main.cpp` script. I built with [cmake](https://cmake.org/download/) and `make`. The commands to configure and build the project are:
```
cmake -B Build/ -S .
make -C Build/ -j 8
``` 
### Creating Behavior Trees
Creating a behavior tree just involves stringing the desired nodes together in a single object like so:
```
SequenceNode<RetryNode<NodeA>, InvertNode<NodeB>, SelectorNode<NodeC, NodeD, NodeE>, NodeF> bt;
```
Running a behavior tree then involves calling the `Tick(...)` function. As long as all the constituent nodes of the tree expect the same parameters to be passed into the "Tick" function then it should work! This is where you would introduce things like "blackboards" or other objects that store information that nodes can use and modify. The Tick function should accept any type and number of parameters meaning you can do flexible things like passing in `this` to give access to a potential owning class's data. There should be some helpful error messages, through the use of C++ concepts, if there are any discrepancies between nodes in terms of what they're expecting in their "Tick" functions. Another helpful thing when building large trees is to break the tree up into types. Because the tree is ultimately a single object you won't be able to take initialized trees and merge them. Instead make use of typedef statements:
```
using tree1=SequenceNode<Node_1, ..., SelectorNode<...>, Node_N>
using tree2=ParallelNode<Sequence<...>,..> 

// The final result for the combined trees could look like this
ParallelNode<tree1, tree2> bt;
bt.Tick(...);
```
## Visualization Tool
This will allow you to setup a simple React app for creating, editing, and viewing behavior trees as well as generating the C++ typedef that would correspond to that tree
### Creat Project Directory
The `behavior-tree-builder.tsx` component script is provided for you but you'll need to create a directory to setup the React app that runs it. Start by creating a javascript project:
```
npx create-next-app@latest bt-builder --typescript --tailwind --eslint
```
### Answers to questions (use arrow keys to select option)
1. Would you like your inside a 'src' directory? _**Yes**_
2. Would you like to useApp Router? _**Yes**_
3. Would you like to use Turbopack for 'next dev'? _**No**_
4. Would you like to customize the import alias? _**No**_
### Install Required Dependencies
You'll need [npm](https://www.geeksforgeeks.org/how-to-download-and-install-node-js-and-npm/). Install will vary depending on your OS 
```
cd bt-builder
npm install lucide-react
npm install reactflow
```
### Install shadcn ui
```
npx shadcn@latest init
```
1. Which style would you like to use? _**Default**_
2. Which color would you like to use as the base color? _**Slate**_
3. Would you like to use CSS variables for theming? _**yes**_
4. How would you like to proceed? _**Use --force**__
Now install required shadcn ui components:
```
npx shadcn@latest add card
npx shadcn@latest add alert
```
### Final setup steps
Copy the `behavior-tree-builder.tsx` file into `bt-builder/src/app/components` (you may need to create the "components" folder). Next, replace the contents of your `src/app/page.tsx` file with this:
```
import BehaviorTreeBuilder from './components/behavior-tree-builder'

export default function Home() {
  return (
    <main className="container mx-auto py-6">
      <BehaviorTreeBuilder />
    </main>
  )
}
```
### Running app!
You can run the deployment server with the following command: `npm run dev`. Open a browser and go to `http://localhost:3000/` to see the app in action!
## Use
You'll start with the control and decorator nodes provided in `BtNodes.hpp` but can add nodes of your own creation by using the "Upload C++ File" button on the left (the logic for grabbing nodes here is primitive -- it's just a regex for C++ class/struct objects that have a `Tick` function signature so be aware of it grabbing things that might not be intended to be behavior tree nodes) 
![Opening Page](<Screenshot 2025-01-21 at 12.01.48 AM.png>)
Once you've uploaded nodes, you can add them to the "Tree Structure" panel below and start reordering them. The drag and drop is a bit clunky but if you click and drag a node to near the _bottom_ of another then that will attempt to add it as child. If you drag and drop it near the _left_ of another node then that will postion it to the left. Clicking on the big minus `-` sign to the right of the node will delete that node and all its children
![Example Tree](<Screenshot 2025-01-21 at 12.33.22 AM.png>)