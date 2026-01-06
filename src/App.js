import React from "react";
import FileUpload from "./FileUpload";

function App() {
  // Replace this with actual logged-in user ID from your auth system
  const userId = "user123";

  return (
    <div>
      <FileUpload userId={userId} />
    </div>
  );
}

export default App;
