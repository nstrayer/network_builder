// !preview r2d3 data=c(0.3, 0.6, 0.8, 0.95, 0.40, 0.20), dependencies = 'd3-jetpack', container = 'div'
//
// r2d3: https://rstudio.github.io/r2d3
//
const drag_hist = {started: {}, ended: {}};
let editing_node = -1;
let currently_dragging = false;

const padding = 15;

// starter data
let net_data = {
  nodes: [
    {id:1, group:null, x:0.3,  y:0.3 },
    {id:2, group:null, x:0.6 , y:0.3 },
    {id:3, group:null, x:0.3 , y:0.6 },
    {id:4, group:null, x:0.6 , y:0.6 }
  ],
  links: [
    {source: 1, target:2},
    {source: 1, target:3},
    {source: 4, target:1},
  ],
};


// scales for x and y and colors
const x = d3.scaleLinear()
  .domain([0,1])
  .range([padding, width-padding]);
  
const y = d3.scaleLinear()
  .domain([0,1])
  .range([height-padding, padding]);

const groupColors = d3.scaleOrdinal(d3.schemeAccent);

const svg = div.append('svg').at({height,width});
const networkViz = svg.selectAppend('g.mainViz');

const tooltip = div.selectAppend('div.tooltip')
  .classed('hidden', true);

const groupChooser = tooltip.append('form');

const exportButton = div.selectAppend('div.export')
  .classed('overlays', true)
  .append('button')
  .text('Download Network');
  
const clearButton = div.selectAppend('div.clear')
  .classed('overlays', true)
  .append('button')
  .text('Clear Network')
  .on('click',function(){
    // reset network data to a single central node
    net_data = {
      nodes: [{id:1, group:null, x:0.5,  y:0.5 }],
      links: [],
    };
    // redraw
    drawNetwork(net_data,networkViz);
  })
  
// the line that gets shown when the user is drawing a link.
const drawnLink = svg.selectAppend("line.drawn")
  .at({
    strokeWidth: 2, 
    stroke: 'red',
  });

// when we submit the form we want to update our data. 
groupChooser.on('submit', function(){
  d3.event.preventDefault();
  
  const group_value = d3.select(this).select('input').property('value');
  
  net_data.nodes.forEach(node => {
    if(node.id == editing_node){
      node.group = group_value;
    }
  });  

  tooltip.classed('hidden', true);

  drawNetwork(net_data,networkViz);
});


function downloadTextFile(data) {
  const name = 'myNetwork.json';
  const text = JSON.stringify(data);
  const a = document.createElement('a');
  const type = name.split(".").pop();
  a.href = URL.createObjectURL( new Blob([text], { type:`text/${type === "txt" ? "plain" : type}` }) );
  a.download = name;
  a.click();
}

function getNodeById(id,data){
  return data.nodes.filter(node => node.id === id)[0];
} 

function getEdgeLocs(data, edge){
  return {
    source: getNodeById(edge.source, data),
    target: getNodeById(edge.target, data),
  };
}

function findClosestNode(data, location){
  const closest_id = data.nodes
    .reduce((closest, node) => {
      const cur_dist = Math.pow(node.x - location.x, 2) + Math.pow(node.y - location.y, 2);
      
      return cur_dist < closest.dist ? {id: node.id, dist: cur_dist} : closest;
    }, {id: -1, dist:100}).id;
    
  return getNodeById(closest_id, data);
}

  
function drawNetwork(data,svg){
  svg.html('');
  tooltip.classed('hidden', true);
  
  const links = data.links.map(d => Object.create(d));
  const nodes = data.nodes.map(d => Object.create(d));

  const link = svg.append("g.links")
    .selectAll("line")
    .data(links.map(edge => getEdgeLocs(data, edge)))
    .enter().append("line");

  const node = svg.append("g.nodes")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
      .attr("r", 15)
      .attr("fill", d =>  groupColors(d.group ? d.group : 'none'));
  
  node.append("title")
    .text(d => d.group ? d.group : 'No group');
  
  node
    .on('mouseover', function(d){
      if(currently_dragging) return;
    })
    .on('mouseout', function(d){
    })
    .on('mousedown',function(d){
      editing_node = d.id;
      // user has clicked on a node
      tooltip
        .classed('hidden', false)
        .st({
          left: `${x(d.x)}px`,
          top: `${y(d.y)}px`
        });
        
      groupChooser
          .html(`
          <h2>${d.group ? 'Group ' + d.group : 'No group'}</h2>
          Edit Group: <input type="text">
          <input type="submit">`);  
    });
  
  // places nodes and links in right locations
  node
    .at({
      cx: d => x(d.x),
      cy: d => y(d.y)
    });
    
  link
    .at({
      x1: d => x(d.source.x),
      x2: d => x(d.target.x),
      y1: d => y(d.source.y),
      y2: d => y(d.target.y)
    });
    
  // Update the download button for the latest data. 
  exportButton.on('click', () => downloadTextFile(data));
}

svg
  .on('dblclick', function(){
    if(!tooltip.classed('hidden')){
      tooltip.classed('hidden', true);
      return;
    }
    const xPos = x.invert(d3.event.offsetX);
    const yPos = y.invert(d3.event.offsetY);
    const lastId = net_data.nodes[net_data.nodes.length-1].id;
    net_data.nodes.push({id: lastId + 1, x: xPos, y: yPos, group: null});
  
    drawNetwork(net_data,networkViz);
  });

svg.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

function dragstarted(d) {
  const location = {x: x.invert(d3.event.x), y: y.invert(d3.event.y)};
  
  drag_hist.started = {
    x: location.x, 
    y: location.y,
    closest: findClosestNode(net_data, location),
  };
    
  currently_dragging = true;
}

function dragged(d) {
    console.log('still dragging!');
    const current_x = d3.event.x;
    const current_y = d3.event.y;
    drawnLink.at({
      opacity: 1,
      x1: x(drag_hist.started.closest.x),
      x2: current_x,
      y1: y(drag_hist.started.closest.y),
      y2: current_y,
    });
    tooltip.classed('hidden', true);
}

function dragended(d) {

  const location = {x: x.invert(d3.event.x), y: y.invert(d3.event.y)};
  
  drag_hist.ended = {
    x: location.x, 
    y: location.y,
    closest: findClosestNode(net_data, location),
  };
  
  const source = drag_hist.started.closest.id;
  const target = drag_hist.ended.closest.id;
  
  if(source != target){
     net_data.links.push({
      source: drag_hist.started.closest.id,
      target: drag_hist.ended.closest.id,  
    });
    
    drawNetwork(net_data,networkViz);
  }
  
  drawnLink.attr('opacity', 0);
  currently_dragging = false;
}

drawNetwork(net_data,networkViz);