class Literal {
    constructor(name, isNegated = false) {
        this.name = name;
        this.isNegated = isNegated;
    }

    negated() {
        return new Literal(this.name, !this.isNegated);
    }

    toString() {
        return (this.isNegated ? "¬" : "") + this.name;
    }
}

class Clause {
    constructor(literals = []) {
        this.literals = literals;
    }

    addLiteral(literal) {
        this.literals.push(literal);
    }

    toString() {
        return this.literals.map(literal => literal.toString()).join(" + ");
    }
}

function reverseStringToClause(str) {
    // Split the string by the "+" symbol
    const literalStrings = str.split(" + ");

    // Initialize an empty Clause object
    const clause = new Clause();

    // Process each literal string
    for (const literalStr of literalStrings) {
        let isNegated = false;
        let name = literalStr;

        // Check if the literal is negated
        if (literalStr.startsWith("¬")) {
            isNegated = true;
            name = literalStr.substring(1); // Remove the negation symbol
        }

        // Create a Literal object and add it to the clause
        const literal = new Literal(name, isNegated);
        clause.addLiteral(literal);
    }

    return clause;
}

async function CDCL(F) {
    let A = {}; // Current assignments
    let level = 0;
    //let conflict = new Clause();

    if (await BCP(F, A) == 'conflict') return false;

    while (hasUnassignedVars(F, A)) {
        level += 1;
        await DECIDE(F, A, level);
        while (await BCP(F, A) == 'conflict') {
            console.log(level);
            let [b, c] = await ANALYZE_CONFLICT(F, A, level);
            F.push(c);

            if (b < 0) {
                return false
            }
            else {
                BACKTRACK(F, A, b);
                level = b;
            }
        }
    }
    return true;
}

function hasUnassignedVars(F, A) {
    for (let clause of F) {
        for (let literal of clause.literals) {
            if (!(literal.name in A)) {
                return true;
            }
        }
    }
    return false;
}

async function DECIDE(F, A, currentLevel) {
    for (let clause of F) {
        for (let literal of clause.literals) {
            if (!(literal.name in A)) {
                // Wait for user input
                let userDecision = await askUserDecision(literal.name);
                A[literal.name] = { value: userDecision, level: currentLevel, isDecision: true };
                changeColor(literal.name, userDecision);
                return;
            }
        }
    }
}

function askUserDecision(literal) {
    return new Promise((resolve) => {
        window.userDecisionCallback = (value) => {
            resolve(value);  // Resume the algorithm with the user's decision
        };
        showDecisionModal(literal, 'decisionModal');
    });
}

async function BCP(F, A) {
    do {
        changesMade = false;

        for (let clause of F) {
            let unassignedLiterals = [];
            let falseLiterals = 0;

            for (let literal of clause.literals) {
                if (literal.name in A) {
                    if (A[literal.name].value === literal.isNegated) {
                        falseLiterals++;
                    }
                } else {
                    unassignedLiterals.push(literal);
                }
            }
            if (unassignedLiterals.length === 1 && falseLiterals === clause.literals.length - 1) {
                // It's a unit clause
                let unitLiteral = unassignedLiterals[0];
                litLevel = countDecisionsInA(A);
                A[unitLiteral.name] = { value: !unitLiteral.isNegated, level: litLevel, isDecision: false };
                changesMade = await unitFind(clause, unitLiteral.name, !unitLiteral.isNegated);
                //changesMade = true;
            }
            else if (falseLiterals === clause.literals.length) {
                // All literals are false, clause is unsatisfied
                if (countDecisionsInA(A) == 0) {
                    //conflict found when no assignment => UNSAT, add the backdrop before dialog close 
                    showConflictModal(clause);
                    document.getElementById('ConflictModal').style.zIndex = 1030
                    $('.modal-backdrop').addClass('red-backdrop');
                    $('#confirmModal').modal('show');
                }
                await conflictFind(clause);
                return 'conflict';
            }
        }
    } while (changesMade);
    return 'no conflict';
}

function countDecisionsInA(A) {
    var count = 0;
    for (lit of Object.keys(A)) {
        if (A[lit].isDecision === true) {
            count += 1;
        }
    }
    return count;
}

function unitFind(clause, literal, assign) {
    return new Promise((resolve) => {
        window.unitCallback = (value) => {
            changeColor(literal, assign);
            resolve(value);  // Resume the algorithm with the user's decision
        };
        showBCPModal(clause, literal, assign);
    });
}

function conflictFind(clause) {
    return new Promise((resolve) => {
        window.conflictCallback = () => {
            resolve();  // Resume the algorithm with the user's decision
        };
        showConflictModal(clause);
    });
}

async function ANALYZE_CONFLICT(F, A, currentLevel) {
    let d = A[decisions[decisions.length - 1]].level; // Get the decision level of the conflict
    if (d === 0) {
        return [-1, null]; // Unresolvable conflict at the root level
    }

    let c = antecedentOf('k');// Get the clause that caused the conflict
    let s = await firstUIP(A, d); // Get the first UIP at level d
    if (!s) {
        return [-1, null]; // No UIP found, the problem is unsatisfiable
    }
    s = s.negated(); // Negate the UIP literal

    while (!isSoleLitAtLevel(s, c, d, A)) {
        let t = lastAssignedLit(c, A); // Get the last assigned literal in clause c
        let v = t.name; // Get the variable of literal t
        let ante = antecedentOf(t.name); // Get the antecedent clause of t
        c = resolve(ante, c, v); // Resolve ante and c on variable v
    }
    let b = assertingLevel(c, d, A);// Find the asserting level for the learned clause
    await findLearnedClause(F, b, c);
    return [b, c]; // Return the backtrack level and the learned clause
}

function assertingLevel(learnedClause, currentLevel, A) {
    let maxLevel = 0;
    learnedClause.literals.forEach(literal => {
        let level = A[literal.name].level;
        if (level < currentLevel && level > maxLevel) {
            maxLevel = level;
        }
    });
    return maxLevel;
}

function findLearnedClause(F, b, c) {
    return new Promise((resolve) => {
        window.nextLearned = (value) => {
            resolve(value);  // Resume the algorithm with the user's decision
        };
        showLearn(F, b, c);
    });
}

function antecedentOf(literal) {
    clauseStr = d3.selectAll(".link-group")
        .filter(function (d) { return d.target.id === literal; })
        .select(".link-label")
        .text();
    return reverseStringToClause(clauseStr);
}

function isSoleLitAtLevel(s, c, d, A) {
    // Check if `s` is in `c` and at decision level `d`
    if (!inClause(s, c) || A[s.name].level !== d) {
        return false;
    }
    // Count the number of literals in `c` that are at decision level `d`
    let countAtLevelD = 0;
    for (let lit of c.literals) {
        if (A[lit.name].level === d) {
            countAtLevelD += 1;
        }
    }
    return countAtLevelD == 1;
}

function inClause(literalToFind, clause) {
    return clause.literals.some(literal =>
        literal.name === literalToFind.name && literal.isNegated === literalToFind.isNegated
    );
}
function lastAssignedLit(c, A) {
    for (var r = decisions.length - 1; r >= 0; r--) {
        var lit = decisions[r];
        if (c.literals.some(literal =>
            literal.name === lit)) {
            return new Literal(lit, A[lit].value);
        }
    }
    return null;
}

function resolve(clause1, clause2, variable) {
    // Create a new clause to store the resolution result
    let resolvedClause = new Clause();

    // Add all literals from clause1 to resolvedClause, except the negation of the variable
    for (let literal of clause1.literals) {
        // if (literal.name !== variable || literal.isNegated==variable) {
        //     resolvedClause.addLiteral(literal);
        // }
        if (literal.name !== variable) {
            resolvedClause.addLiteral(literal);
        }
    }

    // Add all literals from clause2 to resolvedClause, except the variable itself
    for (let literal of clause2.literals) {
        // if (literal.name !== variable || !literal.isNegated) {
        //     // Avoid adding duplicates
        //     if (!resolvedClause.literals.some(l => l.name === literal.name && l.isNegated === literal.isNegated)) {
        //         resolvedClause.addLiteral(literal);
        //     }
        // }
        if (literal.name !== variable) {
            // Avoid adding duplicates
            if (!resolvedClause.literals.some(l => l.name === literal.name && l.isNegated === literal.isNegated)) {
                resolvedClause.addLiteral(literal);
            }
        }
    }

    return resolvedClause;
}


async function firstUIP(A, currentLevel) {
    // Initialize a set to track visited nodes
    let visited = new Set();

    conflictNode = decisions[decisions.length - 1];

    // Initialize a stack for DFS and add the conflict node
    let stack = [conflictNode];
    visited.add(conflictNode);

    // Track the last node visited at the current level
    let lastNodeAtCurrentLevel = null;

    while (stack.length > 0) {
        let nodeName = stack.pop()
        let node = A[nodeName];
        // If we reach a decision node or a node at a different level, continue
        if (node.level !== currentLevel) {
            continue;
        }

        lastNodeAtCurrentLevel = nodeName;

        // Find nodes that imply this node
        let implyingNodes = links.filter(link => link.target.id === nodeName)
            .map(link => link.source.id);

        // Add unvisited implying nodes to the stack
        for (let n of implyingNodes) {
            if (!visited.has(n)) {
                stack.push(n);
                visited.add(n);
            }
        }
    }

    // Return the last node visited at the current level, which is the first UIP
    literalNode = new Literal(lastNodeAtCurrentLevel, !(A[lastNodeAtCurrentLevel].value));
    await findFirstUIP(literalNode.toString());
    return literalNode;
}

function findFirstUIP(uip) {
    return new Promise((resolve) => {
        window.nextUIP = (value) => {
            resolve(value);  // Resume the algorithm with the user's decision
        };
        showUIPModal(uip);
    });
}

function BACKTRACK(F, assignments, backtrackLevel) {
    hideNode('k');
    removeColor();
    // Iterate through the assignments and revert any assignments made 
    // at or after the specified backtrack level
    for (let varName in assignments) {
        if (assignments[varName].level > backtrackLevel) {
            showRemovedDecision(varName, assignments[varName].value);
            setNodeColor(varName, 'white');
            // Revert the assignment
            delete assignments[varName];
            hideNode(varName);
        } else {
            changeColor(varName, assignments[varName].value);
        }
    }

    // Update the current decision level
    clearGraph();
    //decisions = Object.keys(assignments);
    return backtrackLevel;
}


function testCDCL() {
    document.getElementById('start').style.display = 'none';
    let A = new Literal("x");
    let B = new Literal("y");
    let C = new Literal("z");
    let notA = A.negated();
    let notB = B.negated();
    let notC = C.negated();

    // Create clauses
    let clause1 = new Clause([A, B, C]);
    let clause2 = new Clause([A, notB, C]);
    let clause3 = new Clause([A, B, notC]);
    let clause4 = new Clause([A, notB, notC]);
    let clause5 = new Clause([notA, B, C]);
    let clause6 = new Clause([notA, notB, C]);
    let clause7 = new Clause([notA, B, notC]);
    let clause8 = new Clause([notA, notB, notC]);


    // Formula F
    let F = [clause1, clause2, clause3, clause4, clause5, clause6, clause7, clause8];
    let result = CDCL(F);
    console.log('result', result);
}