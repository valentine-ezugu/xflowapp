import { useRouter } from 'expo-router';
import {TouchableOpacity} from "react-native";

const router = useRouter();

<TouchableOpacity onPress={() => router.push('/transaction-details')}>
    {/* Transaction card content */}
</TouchableOpacity>
