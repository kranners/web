// object for holding and dealing with localstorage
const ArrayWorker = {
    get(name) {
        let arr = localStorage.getItem(name);
        return arr ? arr.split(",") : []; // sanity check, if it doesn't exist - then just return nothing
    },
    set(name, arr) {
        localStorage.setItem(name, arr.join(","));
    },
    length(name) {
        return ArrayWorker.get(name).length;
    },
    remove_by_value(name, value) {
        let arr = ArrayWorker.get(name); // grab the old array
        arr.indexOf(value) !== -1 && arr.splice(arr.indexOf(value), 1); // remove the value from it
        ArrayWorker.set(name, arr); // set it back
    },
    push(name, value) {
        let arr = ArrayWorker.get(name); // grab the old array
        arr.push(value);
        ArrayWorker.set(name, arr); // set it back
        return arr;
    },
    pop(name) {
        let arr = ArrayWorker.get(name); // grab the old array
        let val = arr.pop();
        ArrayWorker.set(name, arr); // set it back
        return val;
    }
}

// object for dealing with svg logic, more OO circle
const Circle = {
    instance() {
        return document.getElementById("circle");
    },
    get_attr(attr) {
        return parseFloat(Circle.instance().getAttributeNS(null, attr)); // return the attribute as a number
    },
    set_attr(attr, value) {
        Circle.instance().setAttributeNS(null, attr, value);
    },
    move_to(x, y) {
        Circle.set_attr("cx", x);
        Circle.set_attr("cy", y);
    },
    move(dx, dy) {
        let x = Circle.get_attr("cx");
        let y = Circle.get_attr("cy");
        Circle.move_to(x + dx, y + dy);
        Circle.set_attr("cx", (x + dx));
        Circle.set_attr("cy", (y + dy));
    },
    get_coords() {
        return {
            x : Circle.get_attr("cx"),
            y : Circle.get_attr("cy")
        }
    },
    start_drag() {
        Circle.instance().classList.add("draggable");
    },
    stop_drag() {
        Circle.instance().classList.remove("draggable");
    },
    is_dragging() {
        return Circle.instance().classList.contains("draggable");
    },
    x() {
        return Circle.get_attr("cx");
    },
    y() {
        return Circle.get_attr("cy");
    },
    r() {
        return Circle.get_attr("r");
    }
}

// object for dealing with SVG size logic
const SVG = {
    instance() {
        return document.getElementById("svg");
    },
    update() {
        SVG.instance().setAttributeNS(null, "width", window.innerWidth);
        SVG.instance().setAttributeNS(null, "height", window.innerHeight);
        Portal.update_local();
    },
    get_attr(attr) {
        return parseFloat(SVG.instance().getAttributeNS(null, attr)); // return the attribute as a number
    },
    h() {
        return SVG.get_attr("height");
    },
    w() {
        return SVG.get_attr("width");
    }
}

// object for dealing with window portals
let portals = [];
const Portal = {
    update_local() {
        ArrayWorker.set(window.name+"_coords", [window.screenX, window.screenY, SVG.w(), SVG.h()]);
    },
    check_portals_in(local, remote) {
        // check if the windows overlap, if so there can be no portals made.
        if (local.x != remote.x && local.y != remote.y ){
           // check between the MAXIMUM UPPER BOUND and the MINIMUM LOWER BOUND 
           let max_upper_y = Math.max(local.y, remote.y);
           let min_lower_y = Math.min((local.y+local.h), (remote.y+remote.h));

           if (max_upper_y < min_lower_y) {
               let direction = local.x > remote.x ? "left" : "right";
               Portal.build_portal(direction, min_lower_y, max_upper_y, local);
           }

           let max_upper_x = Math.max(local.x, remote.x);
           let min_lower_x = Math.min((local.x+local.w), (remote.x+remote.w));

           if (max_upper_x < min_lower_x) {
               let direction = local.y > remote.y ? "up" : "down";
               Portal.build_portal(direction, min_lower_x, max_upper_x, local);
           }
        }
    },
    check_all_portals() {
        console.log("Portals: " + JSON.stringify(portals));
        portals = []; // clear all portals for reconstruction
        for(const member of ArrayWorker.get("cluster")) {
            if (member != window.name) {
                let local_coords = ArrayWorker.get(window.name+"_coords");
                let remote_coords = ArrayWorker.get(member+"_coords");
                
                Portal.check_portals_in(
                    {
                        x: parseFloat(local_coords[0]),
                        y: parseFloat(local_coords[1]),
                        w: parseFloat(local_coords[2]),
                        h: parseFloat(local_coords[3]),
                    },
                    {
                        x: parseFloat(remote_coords[0]),
                        y: parseFloat(remote_coords[1]),
                        w: parseFloat(remote_coords[2]),
                        h: parseFloat(remote_coords[3]),
                    }
                );
            }
        }
    },
    build_portal (direction, lower_bound, upper_bound, my_coords) {
        let local_minima = direction == "right" || direction == "left" ? my_coords.y : my_coords.x;

        let portal = {
            direction : direction,
            rel_up : upper_bound - local_minima,
            rel_low : lower_bound - local_minima,
            abs_up : upper_bound,
            abs_low : lower_bound
        }

        portals.push(portal);
    },
    traverse (circle_x, circle_y, circle_dx, circle_dy, portal) {
        // absolute Y of circle
        let abs_y = circle_y + window.screenY;
        let abs_x = circle_x + window.screenX;
        let ticket = {
            circle_x : abs_x,
            circle_y : abs_y,
            circle_dx : circle_dx,
            circle_dy : circle_dy,
            direction : portal.direction
        };
        console.log(JSON.stringify(ticket));

        Circle.instance().style.visibility = "hidden";
        Circle.move_to(0,0);
        localStorage.setItem("ticket", JSON.stringify(ticket));
    },
    recieve () {
        let ticket;
        if (localStorage.getItem("ticket") != null) {
            ticket = JSON.parse(localStorage.getItem("ticket"));
            console.log("found a ticket!")
        } else {
            return
        }

        // check to see if we are the reciever
        for(const portal of portals) {
            // if the portal faces the same direction as the recieve
            if ((ticket.direction == "right" && portal.direction == "left") || (ticket.direction == "left" && portal.direction == "right")){
                // horizontally facing the correct direction
                // check if the abs y is inside the portal
                rel_y = ticket.circle_y - window.screenY;
                if (rel_y > portal.rel_up && rel_y < portal.rel_low) {
                    fullTraverse(portal, ticket, rel_y);
                }
            } else {
                console.log("its not right or left...");
            }
            if ((ticket.direction == "down" && portal.direction == "up") || (ticket.direction == "up" && portal.direction == "down")){
                // horizontally facing the correct direction
                // check if the abs x is inside the portal
                rel_x = ticket.circle_x - window.screenX;
                if (rel_x > portal.rel_up && rel_x < portal.rel_low) {
                    fullTraverse(portal, ticket, rel_x);
                }
            }
        }
    }
}

function fullTraverse(portal, ticket, rel_P) {
    console.log("I traversed!!!")
    localStorage.removeItem("ticket");
    localStorage.setItem("leader", window.name);
    console.log(rel_P);
    dx = ticket.circle_dx;
    dy = ticket.circle_dy;

    let new_x = 0;
    let new_y = 0;
    if (portal.direction == "left") {
        new_x = -Circle.r() + 5;
        new_y = rel_P;
    }
    if (portal.direction == "right") {
        new_x = SVG.w() + Circle.r() - 5;
        new_y = rel_P;
    }
    if (portal.direction == "up") {
        new_y = -Circle.r() + 5;
        new_x = rel_P;
    }
    if (portal.direction == "down") {
        new_y = SVG.h() + Circle.r() - 5;
        new_x = rel_P;
    }

    console.log("new_x " + new_x + " new_y " + new_y);
    Circle.move_to(new_x, new_y);
    checkLeader();
}

// CLUSTER BEHAVIOR

function joinCluster() {
    if (ArrayWorker.length("graveyard") > 0) { // if the graveyard isn't empty
        window.name = ArrayWorker.pop("graveyard"); // grab a value from ther
    } else { // if the graveyard is empty
        window.name = ArrayWorker.length("cluster"); // take the next highest number
    }

    ArrayWorker.push("cluster", window.name);
}

function leaveCluster() {
    if (localStorage.getItem("leader") == window.name) {
        localStorage.removeItem("leader");
    }
    ArrayWorker.remove_by_value("cluster", window.name); // remove myself from the cluster
    ArrayWorker.push("graveyard", window.name); // add myself to the graveyard
}


function refreshName() {
    document.getElementById("name").innerHTML = window.name;
}

// CIRCLE BEHAVIOR
let Mouse = {
    x : 0,
    y : 0,
    px : 0, // 'p' meaning 'previous' eg so I can grab the difference later
    py : 0
}

let dx = 0;
let dy = 0;

const g = 0.3;
const bounce = 1.2;
const drag_coeff = 0.1;

// handles ball collision detection, will return if it collided with the floor
function checkPortals(direction) {
    for (const portal of portals) {
        if (portal.direction == direction) {
            if (direction == "right" || direction == "left") {
                if (Circle.y() > portal.rel_up && Circle.y() < portal.rel_low) {
                    if (Circle.x() < -Circle.r() || (Circle.x() - Circle.r()) > SVG.w()) {
                        Portal.traverse(Circle.x(), Circle.y(), dx, dy, portal);
                        dy = 0;
                    }
                    return true;
                }
            } else {
                if (Circle.x() > portal.rel_up && Circle.x() < portal.rel_low) {
                    if (Circle.y() < -Circle.r() || (Circle.y() - Circle.r()) > SVG.h()) {
                        Portal.traverse(Circle.x(), Circle.y(), dx, dy, portal);
                        dx = 0;
                    }
                    return true;
                }
            }
        }
    }
}
function singleCollide(pos, limit, coordinate) {
    let delta = 0;
    let direction = null;
    // wall collisions
    if ((pos + Circle.r()) >= limit) { // right wall
        // at this point, we check for portals. any portals at the current coordinate, and the collision gets skipped
        direction = coordinate == "x" ? "right" : "down";       
        delta = - ((pos + Circle.r()) - limit) * bounce;
    } else if ((pos - Circle.r()) <= 0) { // left wall
        direction = coordinate == "x" ? "left" : "up";       
        delta = -(pos - Circle.r()) * bounce;
    }

    return direction ? checkPortals(direction) ? 0 : delta : delta;
}
function collisions() {
    let delta_x = singleCollide(Circle.x(), SVG.w(), "x");
    let delta_y = singleCollide(Circle.y(), SVG.h(), "y");
    dx = delta_x ? delta_x : dx;
    dy = delta_y ? delta_y : dy;
    return delta_y ? true : false;
}

function dragTick() {
    dx = (Mouse.x - Circle.get_attr("cx")) * drag_coeff;
    dy = (Mouse.y - Circle.get_attr("cy")) * drag_coeff;

    collisions(); // run through wall collisions
}

function fallTick() {
    if (collisions()) {
        dx = dx / bounce;
    } else {
        dy += g;
    }
}

function tick() {
    if (localStorage.getItem("leader") == window.name) {
        if (Circle.is_dragging()) {
            dragTick();
        } else {
            fallTick();
        }

        Circle.move(dx,dy);
    }
}

// WINDOW FUNCTIONS
function getCursorXY(e) {
  Mouse.x = (window.Event) ? e.pageX : event.clientX + (document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft);
  Mouse.y = (window.Event) ? e.pageY : event.clientY + (document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop);
}

window.onload = function() {
    this.checkLeader();
    this.setInterval(SVG.update, 100); // set tick to run at 60fps
    this.setInterval(Portal.check_all_portals, 1000); // set tick to run at 60fps

    if (window.Event) {
        document.captureEvents(Event.MOUSEMOVE);
        document.captureEvents(Event.MOUSEUP);
    }
    document.onmouseup = Circle.stop_drag
    document.onmousemove = getCursorXY;

    joinCluster();
    refreshName();
}

let circleInterval; // declare the interval number, so that it can be cleared later

function checkLeader() {
    let leader = localStorage.getItem("leader");
    if (!leader || leader == "undefined") {
        // if there is no leader, we need to pick one. it's gonna just be whoever has the smallest number
        let cluster = ArrayWorker.get("cluster");
        localStorage.setItem("leader", cluster[0]);
    }
    if (leader == window.name) { // we are leader
        if (!circleInterval) {
            circleInterval = setInterval(tick, 16); // only setinterval if one does not already exist
        }
        Circle.instance().style.visibility = "visible";
        return true;
    } else {
        clearInterval(circleInterval);
        circleInterval = undefined;
        Circle.instance().style.visibility = "hidden";
        return false;
    }
}

window.onstorage = function() {
    refreshName();
    Portal.recieve();
    checkLeader();
}

window.onbeforeunload = function() {
    leaveCluster();
}
