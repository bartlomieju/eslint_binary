let foo = "foo";

function emptyFn() {
    debugger;

    throw new Error("foo");

    console.log("I'm unreachable");
}