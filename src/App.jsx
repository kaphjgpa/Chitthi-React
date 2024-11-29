import "./App.css";
import Navbar from "../components/Navbar";
import Home from "../components/Home";
import MainApp from "../components/MainApp";
import ErrorPage from "../components/Error";
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
      errorElement: <ErrorPage />, // This handles errors for the root path
    },
    {
      path: "/mainapp",
      element: <MainApp />, // No Fragment needed
    },
    {
      path: "/mainapp/chat/:chatId",
      element: <MainApp />,
    },
    {
      path: "/mainapp/rooms/:roomId",
      element: <MainApp />,
    },
  ]);

  return (
    <div className="App">
      <div className="appContainer">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}

export default App;
