<script>
  let text = "Press Button to get Datetime";

  function getClock() {
    fetch(import.meta.env.VITE_BACKEND_URL + "/clock", { crossDomain: true })
      .then((response) => response.json())
      .then((data) => {
        text = "Most recent date-time from rest endpoint: " + data.someDateTime;
      })
      .catch((reason) => console.log(reason));
  }
</script>

<div>
  <button on:click={getClock}> Refresh Clock </button>
  <div>{text}</div>
</div>
