
function changeColor(literal, value) {
    decisions.push(literal);
    if (value == true) {
        // Get the element with the id 'Clauses'
        var clausesDiv = document.getElementById('Clauses');

        // Use a regular expression to replace 'x' and '¬x' with colored versions
        var neg = '¬' + literal;
        var updatedHtml = clausesDiv.innerHTML.replaceAll(literal, '<span class="green-literal">' + literal + '</span>');
        updatedHtml = updatedHtml.replaceAll('¬<span class="green-literal">' + literal + '</span>', '<span class="red-literal">¬' + literal + '</span>');

        // Update the innerHTML of the clausesDiv with the new HTML
        clausesDiv.innerHTML = updatedHtml;
    }
    else {
        // Get the element with the id 'Clauses'
        var clausesDiv = document.getElementById('Clauses');

        // Use a regular expression to replace 'x' and '¬x' with colored versions
        var neg = '¬' + literal;
        var updatedHtml = clausesDiv.innerHTML.replaceAll(literal, '<span class="red-literal">' + literal + '</span>');
        updatedHtml = updatedHtml.replaceAll('¬<span class="red-literal">' + literal + '</span>', '<span class="green-literal">¬' + literal + '</span>');

        // Update the innerHTML of the clausesDiv with the new HTML
        clausesDiv.innerHTML = updatedHtml;
    }
}

function removeColor() {
    var clausesDiv = document.getElementById('Clauses');

    // Use a regular expression to replace 'x' and '¬x' with colored versions
    var updatedHtml = clausesDiv.innerHTML.replaceAll('green-literal', 'no-color-literal');
    updatedHtml = updatedHtml.replaceAll('red-literal', 'no-color-literal');

    // Update the innerHTML of the clausesDiv with the new HTML
    clausesDiv.innerHTML = updatedHtml;
}


function addLink(from, to, clause) {
    // Add new link
    const newLink = { source: from, target: to };
    links.push(newLink);

    // Update the simulation with the new link
    simulation.force("link").links(links);
    simulation.alpha(1).restart();

    // Bind the updated links data to link groups
    var linkGroup = svg.selectAll(".link-group")
        .data(links, d => d.source.id + "-" + d.target.id);

    // Handle the enter selection for new links
    var linkEnter = linkGroup.enter().append("g")
        .attr("class", "link-group");

    linkEnter.append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#end)");

    linkEnter.append("text")
        .attr("class", "link-label")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function (d) { return clause; });

    // Merge the enter selection with the update selection
    linkGroup.merge(linkEnter);

    // Update the positions of the links and labels
    simulation.on("tick", () => {
        svg.selectAll(".link-group line")
            .attr("x1", d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                const offsetX = (dx * nodeRadius) / r;
                return d.source.x + offsetX;
            })
            .attr("y1", d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                const offsetY = (dy * nodeRadius) / r;
                return d.source.y + offsetY;
            })
            .attr("x2", d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                const offsetX = (dx * nodeRadius) / r;
                return d.target.x - offsetX;
            })
            .attr("y2", d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                const offsetY = (dy * nodeRadius) / r;
                return d.target.y - offsetY;
            });

        svg.selectAll(".link-group text")
            .attr("x", d => (d.source.x + d.target.x) / 2 - 12)
            .attr("y", d => (d.source.y + d.target.y) / 2 - 2);

    });
}
function showNode(nodeId) {
    const node = d3.selectAll(".node").filter(d => d.id === nodeId);
    node.style("opacity", 1);
}

function setNodeColor(nodeId, color) {
    const node = d3.selectAll(".node").filter(d => d.id === nodeId);
    //console.log(node);
    node.select('circle').style("fill", color);
}

function showDecisionModal(literal, modalId) {
    document.getElementById('decisionLiteral').innerHTML = literal;
    $('#' + modalId).modal('show');
}
function userDecide(value) {
    var assign = document.getElementById('decisionLiteral').innerHTML;
    document.getElementById('decisions').innerHTML += '<p>' + assign + ' = ' + value + '</p>';
    document.getElementById('process').innerHTML += '<p> Decision: ' + assign + ' = ' + value + '</p>';
    userDecisionCallback(value);
    setNodeColor(assign, '#87A96B');
    showNode(assign);
    $('#decisionModal').modal('hide');
}

function showBCPModal(clause, unitLiteral, assign) {
    showNode(unitLiteral);
    document.getElementById('process').innerHTML += '<p> BCP: ' + unitLiteral + ' = ' + assign + '</p>';
    var uid = Date.now().toString();
    document.getElementById('BCPModals').innerHTML += generateNewBCPModal(uid);
    document.getElementById('BCPResult' + uid).innerHTML = "<p>Running BCP, unit clause find: " + clause + "</p><p>Assign " + unitLiteral + " = " + assign + "</p>";
    $('#BCPModal' + uid).modal('show');
    for (let literal of clause.literals) {
        if (literal.name != unitLiteral) {
            addLink(literal.name, unitLiteral, clause.toString());
        }
    }
}

function generateNewBCPModal(uid) {
    return `<div class="modal" id="BCPModal` + uid + `" tabindex="-1" aria-labelledby="nextStepModalLabel" aria-hidden="true"
    data-backdrop="static">
    <div class="modal-dialog modal-dialog-bottom-right">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">BCP</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <span id="BCPResult`+ uid + `"></span>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-dismiss="modal" data-whatever=`+ uid + ` onclick="closeBCPModal(this)">I
                    see,
                    continue</button>
            </div>
        </div>
    </div>
</div>`
}
function closeBCPModal(buttonElement) {
    var uid = buttonElement.getAttribute('data-whatever');
    console.log(uid);
    $('#BCPModal' + uid).modal('hide');
    unitCallback(true)
}

function showConflictModal(clause) {
    document.getElementById('ConflictResult').innerHTML = "<p>Conflict clause: " + clause + "</p>";
    document.getElementById('process').innerHTML += '<p> Conflict found: ' + clause + '</p>';
    showNode('k');
    for (let literal of clause.literals) {
        addLink(literal.name, 'k', clause.toString());
    }
    setNodeColor('k', '#fd5c63');
    $('#ConflictModal').modal('show');
}
function showUIPModal(uip) {
    var nodeID = uip.replaceAll('¬', '');
    document.getElementById('FirstUIPResult').innerHTML = "<p>First UIP: " + uip + "</p>";
    document.getElementById('process').innerHTML += '<p> First UIP found: ' + uip + '</p>';
    setNodeColor(nodeID, '#F0E68C');
    $('#UIPModal').modal('show');
}
function showLearn(F, b, c) {
    document.getElementById('LearnedClauseResult').innerHTML = "<p>Learned Clause: " + c + "</p> <p>Backtrack b = " + b + "</p>";
    document.getElementById('process').innerHTML += '<p> Learned Clause: ' + c + '</p><p>Backtrack to level ' + b + '</p>';
    document.getElementById('backtracks').innerHTML += '<p>level b = ' + b + '</p>';
    var clauseId = F.length + 1;
    document.getElementById('Clauses').innerHTML += '<p> C' + clauseId + ': ' + c + '</p>';
    $('#learnedClauseModal').modal('show');
}
function clearGraph() {
    links = [];
    var link = svg.selectAll(".link-group")
        .data(links, d => d.source.id + "-" + d.target.id);

    // Remove any links that no longer exist in the data
    link.exit().remove();
}

function hideNode(nodeId) {
    const node = d3.selectAll(".node").filter(d => d.id === nodeId);
    node.style("opacity", 0);
}
function showRemovedDecision(literal, value) {
    document.getElementById('process').innerHTML += '<p class="removed-decision">' + literal + ' = ' + value + ' </p>'
}