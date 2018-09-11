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

const x = d3.scaleLinear()
  .domain([0,1])
  .range([padding, width-padding]);
  
const y = d3.scaleLinear()
  .domain([0,1])
  .range([height-padding, padding]);

const groupColors = d3.scaleOrdinal(d3.schemeAccent);
  //.domain(['none', 'a']);

const svg = div.append('svg').at({height,width});

const tooltip = div.selectAppend('div.tooltip')
  .classed('hidden', true);

const exportButton = div.selectAppend('div.export')
  .classed('overlays', true)
  .append('button')
  .text('Download Network');
  
const clearButton = div.selectAppend('div.clear')
  .classed('overlays', true)
  .append('button')
  .text('Clear Network')
  .on('click',function(){
    net_data = {
      nodes: [{id:1, group:null, x:0.5,  y:0.5 }],
      links: [],
    }
    
    drawNetwork(net_data,networkViz);
  })

const networkViz = svg.selectAppend('g.mainViz');

const groupChooser = tooltip.append('form');

groupChooser.on('submit', function(){
  d3.event.preventDefault();
  
  const group_value = d3.select(this).select('input').property('value');
  
  net_data.nodes.forEach(node => {
    if(node.id == editing_node){
      node.group = group_value
    }
  });  
  
  tooltip
    .classed('pinned', false)
    .classed('hidden', true);
  
  drawNetwork(net_data,networkViz);
})

// the line that gets shown when the user is drawing a link.
const drawnLink = svg.selectAppend("line.drawn")
  .at({
    strokeWidth: 2, 
    stroke: 'red',
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
  
  const links = data.links.map(d => Object.create(d));
  const nodes = data.nodes.map(d => Object.create(d));

  const link = svg.append("g")
      .attr("stroke", "#999")
    .selectAll("line")
    .data(links.map(edge => getEdgeLocs(data, edge)))
    .enter().append("line")
      .attr("stroke-width", 1);
  
  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
      .attr("r", 5)
      .attr("fill", d =>  groupColors(d.group ? d.group : 'none'));
  
  node
    .on('mouseover', function(d){
      if(currently_dragging) return;
      tooltip
        .classed('hidden', false)
        .st({
          left: `${d3.event.pageX}px`,
          top: `${d3.event.pageY}px`
        });
      
      if(!tooltip.classed('pinned')){
        groupChooser
          .html(`
          <h2>${d.group ? 'Group ' + d.group : 'No group'}</h2>
          Click node to edit group`);  
      }  
      
    })
    .on('mouseout', function(d){
      if( tooltip.classed('pinned')){ return; }

      tooltip.classed('hidden', true);
    })
    .on('mousedown',function(d){
      if(!tooltip.classed('pinned')){
        editing_node = d.id;
        
        groupChooser.html(`
         Enter Group: <input type="text">
         <input type="submit">`
        );
      }
      tooltip.classed('pinned', !tooltip.classed('pinned'));
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
  exportButton.on('click', function(){
    downloadTextFile(data);
  });
}

svg.on('dblclick', function(){
  const xPos = x.invert(d3.event.offsetX);
  const yPos = y.invert(d3.event.offsetY);
  const lastId = net_data.nodes[net_data.nodes.length-1].id;
  net_data.nodes.push({id: lastId + 1, x: xPos, y: yPos, group: null});

  drawNetwork(net_data,networkViz);
}).on('click', function(){
  tooltip
    .classed('pinned', false)
    .classed('hidden', true);
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