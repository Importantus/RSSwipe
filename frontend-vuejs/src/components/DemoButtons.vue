<script>

let backendURL = 'http://localhost:8080/';

export default {
  data() {
    return {
      clockData: "-",
      sqlData: "noResult"
    }
  },
  methods: {
    getClock(event) {
      fetch(backendURL + 'clock', {crossDomain: true})
          .then(response => response.json())
          .then(
              data => this.clockData = "Most recent date-time from rest endpoint: " + data.someDateTime
          )
          .catch(reason => console.log(reason));
    },
    getDatabase(event) {
      fetch(backendURL + 'database/predefined', {crossDomain: true})
          .then(response => response.json())
          .then(
              data => this.sqlData = data.queryResponse
          )
          .catch(reason => console.log(reason));
    }
  }
}
</script>

<template>
  <div class="">
      <button @click="getClock()">Get Clock</button>
      <p>{{ clockData }}</p>
      <br>
      <button @click="getDatabase()">Get Database Query</button>
      <p>{{ sqlData }}</p>
  </div>
</template>