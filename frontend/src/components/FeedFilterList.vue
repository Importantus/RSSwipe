<script setup lang="ts">
import FeedFilterItem from '@/components/FeedFilterItem.vue';
function feedSelected() {
    console.log("FeedSelected");
}
</script>

<template>
    <div class="flex flex-row m-2 gap-2 overflow-scroll no-scrollbar">
        <button class="flex flex-row rounded-xl p-2 px-4 bg-primary-600" @click="feedSelected">
            <div class="align-middle">
                <p class="font-text-detail text-xs">All</p>
            </div>
        </button>
        <FeedFilterItem @feedItemSelected="feedSelected"
            favicon="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAjVBMVEVHcEwAGU4AHlYAFUgAG1AAFUgAWrQAWrQAWrQAFksAVLEAR50AI18AKmkAM3cAQZQAUqkAOIcBYbsBbMQBdc/r+v4ASaQAfNoJtv0AlvX5/v8BiucNx/4NpO6t3PzL5fg0s/gApP8AM5cFhtkUmOFRx/h23v0AHYgPdceYrNHk7vdAbrW0wt2Lx/hFmeMTstenAAAACnRSTlMA////w8P/wx4e1PmKsAAAAh1JREFUOI110utyqyAUBWBiWpuAyjWIini/Nabv/3jdGE9qz0zXrwzrc4MYhC4f4Z/5uCB0+bWC/ycXdHgeYzErNQt8YB/o9ZPJ3mSQxtS9+CH/ABalNcZ2SqX9MA79a7MdYFWYUlrb6x7P/TgO9YyPAHdZ2XfWlq3PPBwEej5vrOxsP7fTRJqsr4dhqEt5mGBMiZVuu/uyukfdwDnrsuxfAJewP2bkXuXr6qq8AgJ9ofAOZDd3Idb3fGFiKjrl8gFet+hSsYMZCxFi6KeynEw/mjGvNyB3ANciQl2tcMJ+cLfcGFf9AnApAgaQ6b7cfGzJYUSRqg0whjHDIV6qac1vT2BU9Sg8wIwhQhjzYF3atRpvn5+fNyONcwCkZoQgShnTMAVAK+0GKJkWB70ghFLEOWNEM7ZUbdtZ2ACAFLBFqgThnCOeUEGJhlvQ2Hpwy8umyb/8CQhPEpQkiaIg2soZa+GYbmgyV6VCCU2TDcRSUyD3fDS2Gk3TZA8YIMU2IEFxElNJOaXtkDtooXfbBiEj8DCAOI4UoXDWrIbv5PzH8r1ghEMXexAnKQCeZln9cO7xlT57Er9ApNUmCki61TBfJ9EGIp+AYgoELpUKJbee8K2JniAKklB7AoFPzzShcbCDYE/EQk18tK95FETP9RcIzjER/i+ENdSnIDjt4O30yvkcwc0kwfln6fSGrqej2HJYOV0Rur6f/8z7FX0D/p9EM232xE0AAAAASUVORK5CYII="
            title="tageschau" />
        <FeedFilterItem @feedItemSelected="feedSelected"
            favicon="
            data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAABA0lEQVR4AbXJIYyDMBjF8SfnzbnJ81OTM8iJWiyOZBaFQWDwweEdDokXqNNYLuSCaZqQhjRNv4N23BYScPcz7yV/0IF/jwMXK76NIgyDR5KmSRiHxTaWQdEtm6VFqDZRB63dhlWsoU2sezvGz6OItrFzU7Dy1m/iqr+UXk47MQizm9mJ9bk817QTL5kf0BuYPxQjQ0fmBXpF7dwS0m+gnjRdvQBK268cTE9UIkNllqvk5EA6k8Dj0yN7da6khdExEWK0cn5K3JtptCAs+YUUmZFSyep008IBt8brxx1VVZXJCahH7mBY8NpjjHmzO2O+4IMDN3x8EcMKPwfQH8D3AXQHfgH4mLPlnWMiaQAAAABJRU5ErkJggg=="
            title="Die Zeit" />
        <FeedFilterItem @feedItemSelected="feedSelected"
            favicon="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAjVBMVEVHcEwAGU4AHlYAFUgAG1AAFUgAWrQAWrQAWrQAFksAVLEAR50AI18AKmkAM3cAQZQAUqkAOIcBYbsBbMQBdc/r+v4ASaQAfNoJtv0AlvX5/v8BiucNx/4NpO6t3PzL5fg0s/gApP8AM5cFhtkUmOFRx/h23v0AHYgPdceYrNHk7vdAbrW0wt2Lx/hFmeMTstenAAAACnRSTlMA////w8P/wx4e1PmKsAAAAh1JREFUOI110utyqyAUBWBiWpuAyjWIini/Nabv/3jdGE9qz0zXrwzrc4MYhC4f4Z/5uCB0+bWC/ycXdHgeYzErNQt8YB/o9ZPJ3mSQxtS9+CH/ABalNcZ2SqX9MA79a7MdYFWYUlrb6x7P/TgO9YyPAHdZ2XfWlq3PPBwEej5vrOxsP7fTRJqsr4dhqEt5mGBMiZVuu/uyukfdwDnrsuxfAJewP2bkXuXr6qq8AgJ9ofAOZDd3Idb3fGFiKjrl8gFet+hSsYMZCxFi6KeynEw/mjGvNyB3ANciQl2tcMJ+cLfcGFf9AnApAgaQ6b7cfGzJYUSRqg0whjHDIV6qac1vT2BU9Sg8wIwhQhjzYF3atRpvn5+fNyONcwCkZoQgShnTMAVAK+0GKJkWB70ghFLEOWNEM7ZUbdtZ2ACAFLBFqgThnCOeUEGJhlvQ2Hpwy8umyb/8CQhPEpQkiaIg2soZa+GYbmgyV6VCCU2TDcRSUyD3fDS2Gk3TZA8YIMU2IEFxElNJOaXtkDtooXfbBiEj8DCAOI4UoXDWrIbv5PzH8r1ghEMXexAnKQCeZln9cO7xlT57Er9ApNUmCki61TBfJ9EGIp+AYgoELpUKJbee8K2JniAKklB7AoFPzzShcbCDYE/EQk18tK95FETP9RcIzjER/i+ENdSnIDjt4O30yvkcwc0kwfln6fSGrqej2HJYOV0Rur6f/8z7FX0D/p9EM232xE0AAAAASUVORK5CYII="
            title="tageschau" />
        <FeedFilterItem @feedItemSelected="feedSelected"
            favicon="
            data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAABA0lEQVR4AbXJIYyDMBjF8SfnzbnJ81OTM8iJWiyOZBaFQWDwweEdDokXqNNYLuSCaZqQhjRNv4N23BYScPcz7yV/0IF/jwMXK76NIgyDR5KmSRiHxTaWQdEtm6VFqDZRB63dhlWsoU2sezvGz6OItrFzU7Dy1m/iqr+UXk47MQizm9mJ9bk817QTL5kf0BuYPxQjQ0fmBXpF7dwS0m+gnjRdvQBK268cTE9UIkNllqvk5EA6k8Dj0yN7da6khdExEWK0cn5K3JtptCAs+YUUmZFSyep008IBt8brxx1VVZXJCahH7mBY8NpjjHmzO2O+4IMDN3x8EcMKPwfQH8D3AXQHfgH4mLPlnWMiaQAAAABJRU5ErkJggg=="
            title="Die Zeit" />
    </div>
</template>