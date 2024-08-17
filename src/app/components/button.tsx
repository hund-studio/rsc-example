"use client";

import { useState } from "react";

const Button = () => {
    const [counter, setCounter] = useState(0);
    console.log(counter);
    return <button onClick={() => setCounter(counter + 1)}>Click me {counter}</button>;
};

export default Button;
