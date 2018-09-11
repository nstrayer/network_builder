// !preview r2d3 data=c(0.3, 0.6, 0.8, 0.95, 0.40, 0.20), dependencies = 'd3-jetpack', container = 'div'
//
// r2d3: https://rstudio.github.io/r2d3
//

const svg = div.append('svg').at({height,width});
const tooltip = div.selectAppend('div.tooltip')
  .classed('hidden', true)

const padding = 15;

const x = d3.scaleLinear()
  .domain([0,1])
  .range([padding, width-padding]);
  
const y = d3.scaleLinear()
  .domain([0,1])
  .range([height-padding, padding]);

let net_data = ({
  nodes: [
    {id:1, group:'a', x:0.3,  y:0.3 },
    {id:2, group:'b', x:0.6 , y:0.3 },
    {id:3, group:'c', x:0.3 , y:0.6 },
    {id:4, group:'b', x:0.6 , y:0.6 }
  ],
  links: [
    {source: 1, target:2},
    {source: 1, target:3},
    {source: 2, target:3},     
    {source: 4, target:1},
  ],
});

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

const drawnLink = svg.selectAppend("line.drawn")
  .at({
    strokeWidth: 2, 
    stroke: 'red',
  });
  
const networkViz = svg.selectAppend('g.mainViz');
  
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
      .attr("fill", 'steelblue');
  
  svg.selectAll('circle')
     .on('click', function(d){
    console.log('clicked the node!');
  });
  
  
  node
    .on('mouseover', function(d){
      tooltip
        .classed('hidden', false)
        .st({
          left: `${d3.event.pageX}px`,
          top: `${d3.event.pageY}px`
        })
        .html(`<h2>ID: ${d.id}</h2>
               <p><strong>Group:</strong><input type='text' name='group' id='group'> </p>`)
  })
  .on('mouseout', function(d){
    if(d.clickedOn){
      console.log('pinning tooltip')
    } else {
      tooltip.classed('hidden', true)   
    }
  })
  .on('mousedown',function(d){
    d.clickedOn = true;
  })
  

  
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
}

function drag(){
  return simulation => {
  
    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }
    
    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
  };
}

svg.on('dblclick', function(){
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

const drag_hist = {started: {}, ended: {}};

function dragstarted(d) {
  const location = {x: x.invert(d3.event.x), y: y.invert(d3.event.y)};
  
  drag_hist.started = {
    x: location.x, 
    y: location.y,
    closest: findClosestNode(net_data, location),
  };
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
  
  net_data.links.push({
    source: drag_hist.started.closest.id,
    target: drag_hist.ended.closest.id,  
  });
  
  drawNetwork(net_data,networkViz);
  drawnLink.attr('opacity', 0);
}

drawNetwork(net_data,networkViz);