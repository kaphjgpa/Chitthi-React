import "./App.css";
import Navbar from "../components/Navbar";
import Home from "../components/Home";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainApp from "../components/MainApp";

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
    {
      path: "/mainapp",
      element: (
        <>
          <MainApp />
        </>
      ),
    },
    {
      path: "/mainapp/chat/:chatId",
      element: (
        <>
          <MainApp />
        </>
      ),
    },
    {
      path: "/mainapp/rooms/:roomId",
      element: (
        <>
          <MainApp />
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
