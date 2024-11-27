import "./App.css";
import Navbar from "../components/Navbar";
import Home from "../components/Home";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <Navbar />
          <Home />
        </>
      ),
    },
  ]);

  return (
    <>
      <div className="App">
        <div className="appContainer">
          <RouterProvider router={router} />
        </div>
      </div>
    </>
  );
}

export default App;
