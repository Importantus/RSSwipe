<script>
  let queryResult = "Press Button to execute predefined query";

  function executeQuery() {
    fetch("http://localhost:3080/database/predefined", { crossDomain: true })
      .then((response) => response.json())
      .then((data) => {
        queryResult =
          "Most recent query result from rest endpoint: " + JSON.stringify(data.queryResponse);
      })
      .catch((reason) => console.log(reason));
  }
</script>

<div>
  <button on:click={executeQuery}> Predefined Query Button </button>
  <div>{JSON.stringify(queryResult)}</div>
</div>
