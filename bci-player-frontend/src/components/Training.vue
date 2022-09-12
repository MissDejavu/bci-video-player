<template>
  <div class="container">
    <div class="row">
      <div class="col">
        <h2>Training</h2>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <b-card no-body class="nav-justified">
          <b-tabs card>
            <b-tab title="SSVEP" active>
              <SSVEPTraining/>
            </b-tab>
            <b-tab title="ERP">
              <ERPTraining/>
            </b-tab>
          </b-tabs>
        </b-card>
      </div>
    </div>
  </div>
</template>

<script>
import SSVEPTraining from "./SSVEPTraining.vue";
import ERPTraining from "./ERPTraining.vue";

export default {
  name: "Training",
  components: { SSVEPTraining, ERPTraining }
};
</script>
